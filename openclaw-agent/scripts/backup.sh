#!/usr/bin/env bash
# Verified backup of config, secrets store, sessions, memory/workspace and the
# gog (Google) token keyring. Runs daily from openclaw-backup.timer.
# Rotation: keeps the newest $KEEP_DAYS days locally.
# Off-site: if AGE_RECIPIENT is set in ~/.openclaw/.env (an age public key, age1...),
# an encrypted copy (*.age) is also produced; copy it off the server (scp/rclone).
source "$(dirname "$0")/lib.sh"
require_agent_user
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"

out="$(oc backup create --output "$BACKUP_DIR" --verify 2>&1)" || { echo "$out"; die "openclaw backup failed"; }
archive="$(echo "$out" | sed -n 's/^Created //p' | tail -1)"
[[ -f "$archive" ]] || die "backup archive not found"

# Google tokens live outside ~/.openclaw (gog file keyring, encrypted with GOG_KEYRING_PASSWORD).
if [[ -d "$HOME/.config/gogcli" ]]; then
  tar -C "$HOME/.config" -czf "${archive%.tar.gz}-gogcli.tar.gz" gogcli
fi

recipient="$(env_get AGE_RECIPIENT)"
if [[ -n "$recipient" ]]; then
  for f in "$archive" "${archive%.tar.gz}-gogcli.tar.gz"; do
    [[ -f "$f" ]] && age -r "$recipient" -o "$f.age" "$f"
  done
fi

find "$BACKUP_DIR" -maxdepth 1 -type f -name '*openclaw-backup*' -mtime +"$KEEP_DAYS" -delete
chmod 600 "$BACKUP_DIR"/* 2>/dev/null || true
logger -t openclaw-backup "backup ok: $(basename "$archive")" 2>/dev/null || true
green "Backup OK: $archive"
