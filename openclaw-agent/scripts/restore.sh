#!/usr/bin/env bash
# Restore a backup archive produced by backup.sh (run as the openclaw user).
#   restore.sh <archive.tar.gz> [--yes]
# The current state is moved aside to ~/.openclaw.pre-restore-<stamp>, never deleted.
source "$(dirname "$0")/lib.sh"
require_agent_user
archive="${1:-}"; [[ -f "$archive" ]] || die "usage: $0 <backup.tar.gz> [--yes]"
if [[ "${2:-}" != "--yes" ]]; then
  read -r -p "Replace the current agent state with $(basename "$archive")? [type: yes] " ans
  [[ "$ans" == yes ]] || die "aborted"
fi
stamp="$(date +%Y%m%d-%H%M%S)"
stage="$HOME/restore-$stamp"
oc backup verify "$archive"
oc backup restore "$archive" --target "$stage"
src="$(find "$stage" -type d -path "*/payload/posix$HOME/.openclaw" | head -1)"
[[ -d "$src" ]] || die "restored payload not found under $stage"

systemctl --user stop openclaw-gateway.service 2>/dev/null || oc gateway stop --force 2>/dev/null || true
mv "$OC_HOME" "$HOME/.openclaw.pre-restore-$stamp"
cp -a "$src" "$OC_HOME"
gogtar="${archive%.tar.gz}-gogcli.tar.gz"
if [[ -f "$gogtar" ]]; then
  [[ -d "$HOME/.config/gogcli" ]] && mv "$HOME/.config/gogcli" "$HOME/.config/gogcli.pre-restore-$stamp"
  tar -C "$HOME/.config" -xzf "$gogtar"
fi
rm -rf "$stage"
oc config validate
restart_gateway
green "Restored. Previous state kept in ~/.openclaw.pre-restore-$stamp"
