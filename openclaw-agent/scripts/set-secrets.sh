#!/usr/bin/env bash
# Interactive: store the model API key and the Telegram bot token in the
# OpenClaw secret store (hidden input, never echoed, never written to the repo).
#   sudo -iu openclaw /opt/agent-kit/openclaw-agent/scripts/set-secrets.sh [anthropic|telegram|all]
source "$(dirname "$0")/lib.sh"
require_agent_user
what="${1:-all}"

if [[ "$what" == anthropic || "$what" == all ]]; then
  echo "Anthropic API key (console.anthropic.com -> API keys). Input is hidden."
  store_secret_prompt ANTHROPIC_API_KEY "ANTHROPIC_API_KEY"
fi
if [[ "$what" == telegram || "$what" == all ]]; then
  echo "Telegram bot token from @BotFather (format 123456:ABC...). Input is hidden."
  store_secret_prompt TELEGRAM_BOT_TOKEN "TELEGRAM_BOT_TOKEN"
fi

"$KIT_DIR/scripts/apply-config.sh"

if [[ "$what" == telegram || "$what" == all ]]; then
  oc channels status --probe 2>&1 | tail -n 15 || true
  cat <<'EOF'

Next: open Telegram, send any message to your bot. It replies with
"Your Telegram user id: <number>". Then lock the bot to you:
  sudo -iu openclaw /opt/agent-kit/openclaw-agent/scripts/telegram-lock.sh <number>
EOF
fi
