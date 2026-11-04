#!/usr/bin/env bash
# Connect ONE Google account (Gmail + Calendar) to the agent through gogcli.
#
#   google-auth.sh <you@gmail.com> <path/to/client_secret.json>
#
# Scopes requested (least privilege for the phase-1 requirements):
#   gmail.readonly      read / search / threads / attachments metadata
#   gmail.compose       create & update DRAFTS (sending is blocked in gog and not exposed)
#   calendar.readonly   read events
# The refresh token is stored in gog's encrypted file keyring; its password
# lives only in ~/.openclaw/.env (mode 600).
source "$(dirname "$0")/lib.sh"
require_agent_user
email="${1:-}"; client_json="${2:-}"
[[ "$email" == *@* && -f "$client_json" ]] || die "usage: $0 <google-email> <client_secret.json>"

export GOG_KEYRING_BACKEND=file
pw="$(env_get GOG_KEYRING_PASSWORD)"
if [[ -z "$pw" ]]; then
  pw="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40)"
  env_set GOG_KEYRING_PASSWORD "$pw"
fi
export GOG_KEYRING_PASSWORD="$pw"
gog auth keyring file >/dev/null

info "Storing OAuth client (Desktop app) credentials"
gog auth credentials set "$client_json" >/dev/null
shred -u "$client_json" 2>/dev/null || rm -f "$client_json"

# Persistent gog MCP ceiling: even if args change, these are the only tools that can exist.
mkdir -p "$HOME/.config/gogcli"
python3 - "$HOME/.config/gogcli/config.json" <<'PY'
import json, os, sys
p = sys.argv[1]
cfg = json.load(open(p)) if os.path.exists(p) else {}
cfg["mcp"] = {
  "allow_tools": ["gmail_search","gmail_get_message","gmail_get_thread","gmail_list_drafts",
                  "gmail_get_draft","gmail_list_labels","gmail_create_draft","gmail_update_draft",
                  "calendar_events"],
  "allow_write": True,
}
json.dump(cfg, open(p, "w"), indent=2)
os.chmod(p, 0o600)
PY

scopes="https://www.googleapis.com/auth/gmail.compose"
common=(auth add "$email" --services gmail,calendar --readonly --extra-scopes "$scopes" --force-consent)

cat <<EOF

=== Google authorization (one time) ===
1. Open the URL printed below in a browser where you are signed in to $email.
2. Approve: read Gmail, manage drafts, read Calendar.
3. The browser will end on a page at http://127.0.0.1/... that FAILS TO LOAD - that is expected.
   Copy the FULL address from the browser's address bar and paste it here.
   (Paste it only into this terminal - never into chat.)
EOF
gog "${common[@]}" --remote --step 1
read -r -p "Paste the full redirect URL: " redirect
gog "${common[@]}" --remote --step 2 --auth-url "$redirect"
redirect=""

env_set GOG_ACCOUNT "$email"
info "Verifying token (read-only calls)"
gog --account "$email" auth list --check || true
gog --account "$email" --readonly --json --results-only gmail labels list >/dev/null && green "Gmail read: OK"
gog --account "$email" --readonly --json --results-only calendar events --today >/dev/null && green "Calendar read: OK"

"$KIT_DIR/scripts/apply-config.sh"
green "Google connected. The agent can read mail, create drafts and read the calendar. It cannot send."
