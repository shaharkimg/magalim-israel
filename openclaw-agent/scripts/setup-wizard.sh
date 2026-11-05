#!/usr/bin/env bash
# Guided first-time setup - everything that needs the owner, in one run:
#   sudo agent setup
# Each step can be skipped and re-run later on its own.
source "$(dirname "$0")/lib.sh"
require_agent_user
S="$KIT_DIR/scripts"
ask() { local a; read -r -p "$1 [Y/n] " a; [[ -z "$a" || "$a" =~ ^[YyכK] ]]; }
hr()  { printf '\n\033[1m━━━ %s ━━━\033[0m\n' "$*"; }

hr "1/5  AI model"
echo "  1) Your Claude subscription (Pro/Max) - recommended, no extra cost"
echo "  2) Google Gemini free tier - free, but Google may use the data (privacy warning)"
echo "  3) Skip for now"
read -r -p "Choose [1]: " c
case "${c:-1}" in
  1) "$S/ai-login.sh" claude || red "AI step failed - rerun later: sudo agent ai claude" ;;
  2) "$S/ai-login.sh" gemini || red "AI step failed - rerun later: sudo agent ai gemini" ;;
  *) echo "skipped" ;;
esac

hr "2/5  WhatsApp (agent on your second SIM)"
if ask "Connect WhatsApp now? (needs the phone with the agent's SIM nearby)"; then
  read -r -p "Your PERSONAL number (the one you will chat from), e.g. 050-1234567: " me
  "$S/whatsapp-setup.sh" "$me" || red "WhatsApp step failed - rerun: sudo agent whatsapp $me"
fi

hr "3/5  Telegram (optional)"
if ask "Also connect a Telegram bot? (n = skip)"; then
  "$S/set-secrets.sh" telegram || true
  read -r -p "After messaging the bot, enter the user id it showed (or Enter to skip): " tid
  [[ -n "$tid" ]] && "$S/telegram-lock.sh" "$tid" --no-restart
fi

hr "4/5  Gmail + Google Calendar"
if ask "Connect Google now? (you need the OAuth client JSON - see SETUP.md step 4)"; then
  read -r -p "Google account email: " gmail
  echo "Open the downloaded client_secret_*.json in a text editor, copy ALL of it,"
  echo "paste it here, then press Enter on an empty line:"
  cs="$(mktemp -p "$OC_TMPDIR" --suffix=.json)"; chmod 600 "$cs"
  while IFS= read -r line; do [[ -z "$line" ]] && break; printf '%s\n' "$line" >> "$cs"; done
  if python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert "installed" in d or "web" in d' "$cs" 2>/dev/null; then
    "$S/google-auth.sh" "$gmail" "$cs" || red "Google step failed - rerun: sudo agent google <email> <file>"
  else
    red "That is not a valid OAuth client JSON - skipped."
  fi
fi

hr "5/5  Scheduled tasks (nothing runs without your approval)"
if [[ -n "$(owner_target)" ]]; then
  "$KIT_DIR/automations/install-templates.sh" >/dev/null 2>&1 || true
  for t in morning-agenda inbox-replies weekly-summary; do
    case "$t" in
      morning-agenda) d="every day 08:00 - today's meetings, conflicts, free slots" ;;
      inbox-replies)  d="Sun-Thu 17:00 - emails waiting for your reply + tasks/deadlines (report only)" ;;
      weekly-summary) d="Sunday 09:00 - the week ahead: meetings, open tasks, pending emails" ;;
    esac
    ask "Enable '$t' ($d) -> sent to you on $(owner_channel)?" && "$KIT_DIR/automations/install-templates.sh" --enable "$t" >/dev/null
  done
else
  echo "No chat channel connected yet - skipped (run later: sudo agent templates)."
fi

hr "Check"
restart_gateway || true
if [[ -n "$(owner_target)" ]]; then
  oc message send --channel "$(owner_channel)" --target "$(owner_target)" \
    --message "✅ העוזר האישי שלך מחובר ופעיל. כתוב לי כאן כל בקשה." >/dev/null 2>&1 \
    && green "Test message sent to you on $(owner_channel)." || red "Could not send a test message (check: sudo agent status)"
fi
"$S/status.sh" 2>/dev/null | sed -n '1,60p'
