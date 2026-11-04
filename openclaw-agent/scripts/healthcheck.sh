#!/usr/bin/env bash
# Root-run health check (openclaw-health.timer, every 10 min).
# - restarts the gateway if it is not answering
# - alerts the owner (WhatsApp or Telegram) after a recovery, or when disk is >90% full
set -uo pipefail
AGENT_USER=openclaw
uid="$(id -u "$AGENT_USER")"
STATE=/var/lib/openclaw-health; mkdir -p "$STATE"
as_agent() { runuser -u "$AGENT_USER" -- env HOME="/home/$AGENT_USER" XDG_RUNTIME_DIR="/run/user/$uid" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" TZ=Asia/Jerusalem bash -lc "$*"; }
healthy() { as_agent "openclaw gateway status 2>/dev/null" | grep -q "Connectivity check: ok"; }
envv() { grep -E "^$1=" "/home/$AGENT_USER/.openclaw/.env" 2>/dev/null | tail -1 | cut -d= -f2-; }
tg="$(envv TELEGRAM_OWNER_ID)"; wa="$(envv WHATSAPP_OWNER)"; ch="$(envv PRIMARY_CHANNEL)"
[[ -n "$ch" ]] || { [[ -n "$wa" ]] && ch=whatsapp || ch=telegram; }
[[ "$ch" == whatsapp ]] && to="$wa" || to="$tg"
notify() {
  [[ -n "$to" && "$to" =~ ^\+?[0-9]+$ ]] || return 0
  as_agent "openclaw message send --channel '$ch' --target '$to' --message '$1'" >/dev/null 2>&1 || true
}

if healthy; then
  rm -f "$STATE/failing"
else
  logger -t openclaw-health "gateway unhealthy -> restarting"
  touch "$STATE/failing"
  as_agent "systemctl --user restart openclaw-gateway.service"
  for _ in $(seq 1 30); do healthy && break; sleep 4; done
  if healthy; then
    logger -t openclaw-health "gateway recovered"
    notify "⚠️ הסוכן הופעל מחדש אוטומטית לאחר תקלה ($(date '+%d.%m %H:%M')). פרטים: agent logs"
    rm -f "$STATE/failing"
  else
    logger -t openclaw-health "gateway still unhealthy after restart"
  fi
fi

usage="$(df --output=pcent / | tail -1 | tr -dc 0-9)"
if (( usage > 90 )) && [[ ! -f "$STATE/disk-alerted" ]]; then
  notify "⚠️ הדיסק בשרת הסוכן מלא ב-${usage}%."
  touch "$STATE/disk-alerted"
elif (( usage <= 85 )); then
  rm -f "$STATE/disk-alerted"
fi
exit 0
