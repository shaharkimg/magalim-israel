#!/usr/bin/env bash
# Store the Telegram bot token (hidden input) in the OpenClaw secret store.
#   set-secrets.sh telegram
# (The AI model is connected with ai-login.sh: claude | gemini | apikey.)
source "$(dirname "$0")/lib.sh"
require_agent_user
case "${1:-telegram}" in
  telegram|all)
    echo "Telegram bot token from @BotFather (format 123456:ABC...). Input is hidden."
    store_secret_prompt TELEGRAM_BOT_TOKEN "TELEGRAM_BOT_TOKEN"
    "$KIT_DIR/scripts/apply-config.sh"
    oc channels status --probe 2>&1 | tail -n 15 || true
    cat <<'MSG'

Next: open Telegram and send any message to your bot. It answers with a system
message "Your Telegram user id: <number>" (the agent itself is not active for you yet).
The same id is shown on the server by:   agent pairing
Then lock the bot to you:                agent lock <number>
MSG
    ;;
  anthropic) exec "$KIT_DIR/scripts/ai-login.sh" apikey ;;
  *) die "usage: $0 telegram" ;;
esac
