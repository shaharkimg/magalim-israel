#!/usr/bin/env bash
# Lock the Telegram bot to ONE numeric Telegram user id (the owner).
#   telegram-lock.sh <numeric_user_id> [--no-restart]
source "$(dirname "$0")/lib.sh"
require_agent_user
owner="${1:-}"
[[ "$owner" =~ ^[0-9]{3,20}$ ]] || die "usage: $0 <numeric Telegram user id>"

env_set TELEGRAM_OWNER_ID "$owner"
patch="$(mktemp --suffix=.json5)"
cat > "$patch" <<EOF
{
  channels: { telegram: { dmPolicy: "allowlist", allowFrom: ["$owner"], groupPolicy: "disabled" } },
  commands: { ownerAllowFrom: ["telegram:$owner"] },
  // Any failed scheduled task is reported to the owner on Telegram.
  cron: { failureAlert: { enabled: true, after: 1, mode: "announce", channel: "telegram", to: "$owner" } },
}
EOF
oc config patch --file "$patch"
rm -f "$patch"
green "Telegram locked to user id $owner (dmPolicy=allowlist, groups disabled)."
[[ "${2:-}" == "--no-restart" ]] || restart_gateway
