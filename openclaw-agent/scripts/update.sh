#!/usr/bin/env bash
# Controlled update with automatic rollback (run as root):
#   update.sh [openclaw-version|latest|""] [kit-ref]
#   update.sh 2026.11.5          # pin a version
#   update.sh latest             # newest stable from npm
#   update.sh "" main            # keep OpenClaw version, update kit only
# Steps: backup -> update kit -> install pinned OpenClaw -> doctor -> restart ->
#        health check -> rollback to previous version on failure.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "run as root (sudo)"; exit 1; }
AGENT_USER=openclaw; uid="$(id -u "$AGENT_USER")"
KIT_ROOT=/opt/agent-kit; KIT="$KIT_ROOT/openclaw-agent"
as_agent() { runuser -u "$AGENT_USER" -- env HOME="/home/$AGENT_USER" XDG_RUNTIME_DIR="/run/user/$uid" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" TZ=Asia/Jerusalem BACKUP_DIR=/var/backups/openclaw bash -lc "$*"; }
healthy() { as_agent "openclaw gateway status 2>/dev/null" | grep -q "Connectivity check: ok"; }

current="$(openclaw --version | awk '{print $2}')"
target="${1:-$current}"
[[ "$target" == latest ]] && target="$(npm view openclaw dist-tags.latest)"
kit_ref="${2:-}"
echo "OpenClaw: $current -> $target"
echo "Release notes: https://github.com/openclaw/openclaw/releases"

echo "== 1/6 backup"; as_agent "$KIT/scripts/backup.sh"
if [[ -n "$kit_ref" ]]; then
  echo "== 2/6 kit -> $kit_ref"
  git -C "$KIT_ROOT" fetch --depth 1 origin "$kit_ref" && git -C "$KIT_ROOT" checkout -q --force FETCH_HEAD
  chmod -R a+rX,go-w "$KIT_ROOT"
else echo "== 2/6 kit unchanged"; fi
echo "== 3/6 system packages (security) + Node"
apt-get update -y >/dev/null && apt-get install -y --only-upgrade nodejs >/dev/null || true
if [[ "$target" != "$current" ]]; then
  echo "== 4/6 openclaw@$target"
  npm install -g --allow-scripts=@google/genai,esbuild,protobufjs,openclaw "openclaw@$target"
else echo "== 4/6 openclaw already $target"; fi
if as_agent "openclaw plugins list 2>/dev/null" | grep -qw whatsapp; then
  echo "   whatsapp plugin -> $target"
  as_agent "openclaw plugins install npm:@openclaw/whatsapp@$target --pin --force" || echo "   (whatsapp plugin update failed - kept previous)"
fi
echo "== 5/6 doctor + config"
as_agent "openclaw doctor --non-interactive" || as_agent "openclaw doctor" || true
as_agent "$KIT/scripts/apply-config.sh --no-restart"
echo "== 6/6 restart + health"
as_agent "systemctl --user restart openclaw-gateway.service"
for _ in $(seq 1 40); do healthy && { echo "UPDATE OK: $(openclaw --version)"; exit 0; }; sleep 3; done

echo "!! Gateway unhealthy after update -> rolling back to $current"
npm install -g --allow-scripts=@google/genai,esbuild,protobufjs,openclaw "openclaw@$current"
as_agent "openclaw plugins list 2>/dev/null" | grep -qw whatsapp && as_agent "openclaw plugins install npm:@openclaw/whatsapp@$current --pin --force" || true
as_agent "systemctl --user restart openclaw-gateway.service"
sleep 15; healthy && echo "Rolled back to $current (healthy)." || echo "Rollback unhealthy: restore with: agent restore <latest backup>"
exit 1
