#!/usr/bin/env bash
# Shared helpers for the personal OpenClaw agent scripts.
# Every script runs as the dedicated "openclaw" user unless stated otherwise.
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OC_HOME="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
OC_ENV_FILE="$OC_HOME/.env"
OC_WORKSPACE="$OC_HOME/workspace"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
export TZ="${TZ:-Asia/Jerusalem}"
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin"
umask 077

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
info()  { printf '==> %s\n' "$*"; }
die()   { red "ERROR: $*" >&2; exit 1; }

require_agent_user() {
  [[ "$(id -un)" == "openclaw" ]] || die "Run as the openclaw user:  sudo -iu openclaw $0 $*"
}

oc() { openclaw "$@"; }

# Set KEY=VALUE in ~/.openclaw/.env (mode 600) without echoing the value.
env_set() {
  local key="$1" value="$2"
  mkdir -p "$OC_HOME"; touch "$OC_ENV_FILE"; chmod 600 "$OC_ENV_FILE"
  local tmp; tmp="$(mktemp)"
  grep -v "^${key}=" "$OC_ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$OC_ENV_FILE"; chmod 600 "$OC_ENV_FILE"
}

env_get() { [[ -f "$OC_ENV_FILE" ]] && grep -E "^$1=" "$OC_ENV_FILE" | tail -1 | cut -d= -f2- || true; }

store_has() { oc secrets store list 2>/dev/null | grep -qE "^$1 "; }

# Read a secret from the terminal (hidden) and write it to the OpenClaw secret store.
store_secret_prompt() {
  local name="$1" prompt="$2" value=""
  read -r -s -p "$prompt: " value; echo
  [[ -n "$value" ]] || die "empty value"
  printf '%s' "$value" | oc secrets store set "$name" --kind secret --value-file - >/dev/null
  value=""
  green "Stored $name in the OpenClaw secret store (write-only)."
}

restart_gateway() {
  [[ "${OC_SKIP_RESTART:-0}" == 1 ]] && { info "OC_SKIP_RESTART=1: not restarting"; return 0; }
  if systemctl --user is-enabled openclaw-gateway.service >/dev/null 2>&1; then
    systemctl --user restart openclaw-gateway.service
  else
    oc gateway restart >/dev/null 2>&1 || true
  fi
  for _ in $(seq 1 40); do
    oc gateway status 2>/dev/null | grep -q "Connectivity check: ok" && { green "Gateway is up."; return 0; }
    sleep 3
  done
  die "Gateway did not become healthy; see: journalctl --user -u openclaw-gateway -n 100"
}
