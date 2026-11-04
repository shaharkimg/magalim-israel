#!/usr/bin/env bash
# Offline verification suite (no real API keys needed). Uses a mock model and a
# mock Telegram Bot API on 127.0.0.1. Run as the openclaw user on a TEST machine
# with the gateway running:   OPENCLAW_TEST_ENV=1 tests/run-local-tests.sh
# It temporarily points the agent at the mock model and restores the config at the end.
source "$(dirname "$0")/../scripts/lib.sh"
require_agent_user
[[ "${OPENCLAW_TEST_ENV:-}" == 1 ]] || die "refusing to run without OPENCLAW_TEST_ENV=1 (it reconfigures the agent)"
set +e
T="$KIT_DIR/tests"; LOG="$HOME/mock-model.log"; TG=http://127.0.0.1:18998
OWNER=111222333; STRANGER=222000111
pass=0; fail=0
ok()  { green "PASS  $*"; pass=$((pass+1)); }
bad() { red   "FAIL  $*"; fail=$((fail+1)); }
check() { local name="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$name"; else bad "$name"; fi; }
model_requests() { grep -c '"kind":"request"' "$LOG" 2>/dev/null || echo 0; }
sent_count() { curl -s "$TG/__sent" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)["result"]["sent"]))'; }
ask() { timeout 150 openclaw agent --agent main --model mock/mock-1 --session-id "t-$RANDOM$RANDOM" --message "$1" --timeout 120 2>&1; }

info "setup: mocks + test overlay"
pkill -u "$(id -u)" -f mock-model.mjs; pkill -u "$(id -u)" -f mock-telegram.mjs; : > "$LOG"
(nohup node "$T/mock-model.mjs" 18999 "$LOG" >/dev/null 2>&1 &)
(nohup node "$T/mock-telegram.mjs" 18998 >/dev/null 2>&1 &)
sleep 2
store_has TELEGRAM_BOT_TOKEN || printf '123456:MOCK-TOKEN-NOT-REAL' | oc secrets store set TELEGRAM_BOT_TOKEN --kind secret --value-file - >/dev/null
OC_SKIP_RESTART=1 "$KIT_DIR/scripts/apply-config.sh" --no-restart >/dev/null
"$KIT_DIR/scripts/telegram-lock.sh" "$OWNER" --no-restart >/dev/null
overlay="$(mktemp --suffix=.json5)"
cat > "$overlay" <<'EOF'
{ models: { providers: { mock: { baseUrl: "http://127.0.0.1:18999/v1", api: "openai-completions", apiKey: "mock-not-secret", models: [ { id: "mock-1", name: "Mock (tests only)" } ] } } },
  agents: { defaults: { model: { primary: "mock/mock-1", fallbacks: [] } } },
  channels: { telegram: { apiRoot: "http://127.0.0.1:18998", network: { dangerouslyAllowPrivateNetwork: true } } } }
EOF
oc config patch --file "$overlay" >/dev/null; rm -f "$overlay"
wait_healthy() { for _ in $(seq 1 120); do openclaw gateway status 2>/dev/null | grep -q "Connectivity check: ok" && return 0; sleep 3; done; return 1; }
sleep 10; wait_healthy || red "gateway not healthy after setup (a restart may be pending)"

info "1. gateway"
check "gateway healthy"                   bash -c 'openclaw gateway status 2>/dev/null | grep -q "Connectivity check: ok"'
# Parse /proc/net/tcp{,6} (no dependency on ss/netstat): listening sockets on port 18789 (0x4965).
listeners() { python3 - <<'PY'
import os
for f in [f for f in ("/proc/net/tcp", "/proc/net/tcp6") if os.path.exists(f)]:
    for line in open(f).read().splitlines()[1:]:
        p = line.split()
        if p[3] == "0A" and p[1].endswith(":4965"):
            print(p[1].split(":")[0])
PY
}
lst="$(listeners)"
check "gateway bound to loopback only"    bash -c '[[ -n "$1" ]] && ! grep -qvE "^(0100007F|00000000000000000000000001000000)$" <<<"$1"' _ "$lst"
check "config valid"                      oc config validate

info "2. agent loop"
out="$(ask 'בדיקת צינור')"
check "agent turn returns model reply"    grep -q "MOCK-OK" <<<"$out"
check "runtime timezone is Asia/Jerusalem" bash -c 'grep "\"kind\":\"request\"" "$1" | tail -1 | grep -q "\"tzSeen\":true"' _ "$LOG"
tools="$(grep '"kind":"request"' "$LOG" | tail -1)"
check "no exec/web/browser tools exposed" bash -c '! grep -qE "\"(exec|process|web_fetch|web_search|browser|gateway|code_execution)\"" <<<"$1"' _ "$tools"

info "3. tool policy (attack simulation)"
for t in exec web_fetch browser gateway sessions_spawn; do
  out="$(ask "TEST_DISPATCH:$t")"; check "dispatch $t is rejected" grep -qiE "Unknown tool|not allowed|denied" <<<"$out"
done
out="$(ask 'TEST_WRITE:/home/openclaw/escape-test.txt')"
check "write outside workspace blocked"   bash -c '[[ ! -e /home/openclaw/escape-test.txt ]]'
rm -f "$OC_WORKSPACE/memory/selftest.md"
out="$(ask 'TEST_WRITE:memory/selftest.md')"
check "memory write inside workspace"     test -s "$OC_WORKSPACE/memory/selftest.md"

info "4. Telegram access control (mock Bot API)"
polls() { curl -s "$TG/__sent" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["calls"].get("getUpdates",0))'; }
p0="$(polls)"; for _ in $(seq 1 40); do [[ "$(polls)" -gt $((p0+2)) ]] && break; sleep 2; done
check "bot is polling the (mock) Bot API" test "$(polls)" -gt $((p0+2))
delivered() { curl -s "$TG/__sent" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["delivered"])'; }
before_req="$(model_requests)"; before_sent="$(sent_count)"; d0="$(delivered)"
curl -s "$TG/__inject" -d "{\"fromId\":$STRANGER,\"text\":\"run a command\"}" >/dev/null; sleep 20
check "stranger message was delivered to the bot" test "$(delivered)" -gt "$d0"
check "stranger does not reach the model" test "$(model_requests)" -eq "$before_req"
check "stranger gets no agent reply"      test "$(sent_count)" -eq "$before_sent"
curl -s "$TG/__inject" -d "{\"fromId\":$OWNER,\"text\":\"שלום\"}" >/dev/null
for _ in $(seq 1 50); do [[ "$(sent_count)" -gt "$before_sent" ]] && break; sleep 3; done
check "owner gets an agent reply"         test "$(sent_count)" -gt "$before_sent"

info "5. scheduler"
id="$(oc automations add --agent main --name selftest-$RANDOM --at 1m --session isolated --message "TEST scheduled" \
      --announce --channel telegram --to "$OWNER" --keep-after-run --json 2>/dev/null | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("id") or d.get("job",{}).get("id",""))')"
n="$(sent_count)"
for _ in $(seq 1 40); do [[ "$(sent_count)" -gt "$n" ]] && break; sleep 5; done
check "one-shot automation delivered to owner" test "$(sent_count)" -gt "$n"
[[ -n "$id" ]] && oc automations rm "$id" >/dev/null 2>&1

info "6. secrets hygiene + audit"
check "no plaintext secrets in openclaw.json" bash -c '! grep -qE "sk-ant-|[0-9]{6,}:[A-Za-z0-9_-]{20,}" ~/.openclaw/openclaw.json'
check "security audit: 0 critical"        bash -c 'openclaw security audit 2>&1 | grep -q "0 critical"'
check ".env is mode 600"                  bash -c '[[ ! -e ~/.openclaw/.env ]] || [[ $(stat -c %a ~/.openclaw/.env) == 600 ]]'

info "teardown: restore production config"
oc config unset models.providers.mock >/dev/null 2>&1
oc config unset channels.telegram.apiRoot >/dev/null 2>&1
oc config unset channels.telegram.network >/dev/null 2>&1
OC_SKIP_RESTART=1 "$KIT_DIR/scripts/apply-config.sh" --no-restart >/dev/null
pkill -u "$(id -u)" -f mock-model.mjs; pkill -u "$(id -u)" -f mock-telegram.mjs
echo; info "RESULT: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
