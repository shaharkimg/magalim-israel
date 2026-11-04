#!/usr/bin/env bash
# Lock the Telegram bot to ONE numeric Telegram user id (the owner).
#   telegram-lock.sh <numeric_user_id> [--no-restart]
source "$(dirname "$0")/lib.sh"
require_agent_user
owner="${1:-}"
[[ "$owner" =~ ^[0-9]{3,20}$ ]] || die "usage: $0 <numeric Telegram user id>"
env_set TELEGRAM_OWNER_ID "$owner"
sync_owner_policies
green "Telegram locked to user id $owner (dmPolicy=allowlist, groups disabled, outbound guard updated)."
[[ "${2:-}" == "--no-restart" ]] || restart_gateway
