#!/usr/bin/env bash
# Connect the AI model.
#   ai-login.sh claude   (default, no extra cost) uses your existing Claude Pro/Max subscription
#   ai-login.sh gemini   (free) Google AI Studio free tier - see privacy warning
#   ai-login.sh apikey   (paid, pay-as-you-go) Anthropic API key
source "$(dirname "$0")/lib.sh"
require_agent_user
mode="${1:-claude}"

stop_gw()  { systemctl --user stop openclaw-gateway.service 2>/dev/null || oc gateway stop --force >/dev/null 2>&1 || true; sleep 3; }
start_gw() { OC_SKIP_RESTART="${OC_SKIP_RESTART:-0}" restart_gateway; }

case "$mode" in
claude)
  command -v claude >/dev/null || die "Claude Code CLI not installed (deploy/install.sh installs it)"
  cat <<'EOF'

=== Connect your Claude subscription (no extra cost) ===
Before you start (one time, to guarantee it stays free):
  claude.ai -> Settings -> Usage (or Billing): make sure "Extra usage" is OFF.
  Then the agent can only use your plan's included limits - it can never create a charge.

1. A link appears below. Open it in a browser where you are signed in to claude.ai
   (phone or computer) and click Authorize.
2. Copy the code the page shows and paste it here, then press Enter.
The token created is limited to "user:inference" (model calls only) and valid for 1 year.
EOF
  raw="$(mktemp -p "$OC_TMPDIR")"; chmod 600 "$raw"
  stop_gw
  script -qfec "stty cols 400 rows 50; claude setup-token" "$raw" || true
  token="$(python3 - "$raw" <<'PY'
import re, sys
t = open(sys.argv[1], "rb").read().decode("utf8", "replace")
t = re.sub(r"\x1b\[[0-9;?<>=]*[a-zA-Z~]", "", t)
t = re.sub(r"\x1b\][^\x07]*\x07", "", t)
m = re.findall(r"sk-ant-oat01-[A-Za-z0-9_\-]{20,}", t.replace("\r", "\n"))
print(m[-1] if m else "")
PY
)"
  shred -u "$raw" 2>/dev/null || rm -f "$raw"
  if [[ -z "$token" ]]; then
    read -r -s -p "Token not detected automatically. Paste the sk-ant-oat01-... token (hidden): " token; echo
  fi
  [[ "$token" == sk-ant-oat01-* ]] || { start_gw; die "no valid token"; }
  printf '%s' "$token" | oc models auth paste-token --provider anthropic --expires-in 365d >/dev/null
  token=""
  env_set AI_ROUTE claude-subscription
  env_set AI_TOKEN_CREATED "$(date +%F)"
  "$KIT_DIR/scripts/set-model.sh" opus >/dev/null
  start_gw
  green "Claude subscription connected (Opus 5.5, fallback Sonnet 5.5). Token renews: $(date -d '+1 year' +%F) - rerun: agent ai claude"
  ;;
gemini)
  cat <<'EOF'

=== Google Gemini free tier ===
!! PRIVACY: on the FREE tier Google may use your prompts and the agent's answers - which
!! will include content of your emails and calendar - to improve its products, and human
!! reviewers may read them. Prefer "agent ai claude" if you have a Claude subscription.
Free-tier models are also weaker against prompt injection hidden in emails.

1. Open https://aistudio.google.com/apikey (sign in with Google), click "Create API key".
2. Paste the key here (hidden).
EOF
  read -r -p 'Type "yes" to accept the privacy terms above: ' ok; [[ "$ok" == yes ]] || die "cancelled"
  store_secret_prompt GEMINI_API_KEY "GEMINI_API_KEY"
  p="$(mktemp -p "$OC_TMPDIR" --suffix=.json5)"
  echo '{ models: { providers: { google: { apiKey: { source: "store", provider: "default", id: "GEMINI_API_KEY" }, agentRuntime: { id: "openclaw" } } } } }' > "$p"
  oc config patch --file "$p" >/dev/null; rm -f "$p"
  info "Discovering free Gemini models"
  model="$(oc models list --provider google --refresh --plain 2>/dev/null | grep -oE 'google/gemini-[0-9.]+-flash[a-z0-9.-]*' | grep -v -- '-lite' | grep -v -i preview | sort -V | tail -1)"
  [[ -n "$model" ]] || model="$(oc models list --provider google --plain 2>/dev/null | grep -oE 'google/gemini-[^ ]*flash[^ ]*' | sort -V | tail -1)"
  [[ -n "$model" ]] || die "no Gemini Flash model found for this key"
  "$KIT_DIR/scripts/set-model.sh" "$model" "$model" >/dev/null
  env_set AI_ROUTE gemini-free
  restart_gateway
  green "Gemini connected: $model (free tier; check limits at https://aistudio.google.com/usage)"
  ;;
apikey)
  echo "Anthropic API key (paid per use). Set a monthly spend limit at console.anthropic.com first."
  store_secret_prompt ANTHROPIC_API_KEY "ANTHROPIC_API_KEY"
  env_set AI_ROUTE anthropic-api
  "$KIT_DIR/scripts/apply-config.sh"
  ;;
*) die "usage: $0 claude|gemini|apikey" ;;
esac
