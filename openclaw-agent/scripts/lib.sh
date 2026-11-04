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
# Private scratch dir for config patches; removed on exit (also on failure).
OC_TMPDIR="$(mktemp -d)"; trap 'rm -rf "$OC_TMPDIR"' EXIT

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

# "050-123 4567" / "972501234567" / "+972501234567" -> +972501234567 (Israeli local numbers get +972)
normalize_e164() {
  local d; d="$(printf '%s' "${1:-}" | tr -cd '0-9+')"
  [[ "$d" == +* ]] || { [[ "$d" == 0* ]] && d="+972${d#0}" || d="+$d"; }
  [[ "$d" =~ ^\+[1-9][0-9]{7,14}$ ]] || return 1
  printf '%s\n' "$d"
}

# Owner's preferred channel for proactive messages: whatsapp | telegram
owner_channel() {
  local c; c="$(env_get PRIMARY_CHANNEL)"
  if [[ -z "$c" ]]; then [[ -n "$(env_get WHATSAPP_OWNER)" ]] && c=whatsapp || c=telegram; fi
  printf '%s\n' "$c"
}
owner_target() {
  case "$(owner_channel)" in
    whatsapp) env_get WHATSAPP_OWNER ;;
    *)        env_get TELEGRAM_OWNER_ID ;;
  esac
}

plugin_installed() { oc plugins list 2>/dev/null | grep -qE "(^|[[:space:]│|])$1([[:space:]│|]|$)"; }

# Official WhatsApp plugin, pinned to the installed OpenClaw version.
ensure_whatsapp_plugin() {
  plugin_installed whatsapp && return 0
  local v; v="$(openclaw --version | awk '{print $2}')"
  info "Installing official WhatsApp plugin @openclaw/whatsapp@$v"
  oc plugins install "npm:@openclaw/whatsapp@$v" --pin
}

# Local guard plugin shipped in this kit (root-owned path, read-only for the agent).
ensure_guard_plugin() {
  plugin_installed owner-only-outbound && return 0
  info "Linking owner-only-outbound guard plugin"
  oc plugins install --link "$KIT_DIR/plugins/owner-only-outbound" --force
}

# Write owner-dependent policy in ONE config patch: guard allowlist, channel
# allowlists, owner commands and failure alerts. Fail-closed: no owner -> the
# guard blocks every outbound message on that channel.
sync_owner_policies() {
  local tg wa ch to patch
  tg="$(env_get TELEGRAM_OWNER_ID)"; wa="$(env_get WHATSAPP_OWNER)"
  ch="$(owner_channel)"; to="$(owner_target)"
  patch="$(mktemp -p "$OC_TMPDIR" --suffix=.json5)"
  {
    echo '{'
    echo '  plugins: { entries: { "owner-only-outbound": { enabled: true, hooks: { allowConversationAccess: true },'
    printf '    config: { owners: { telegram: [%s], whatsapp: [%s] } } } } },\n' \
      "${tg:+\"$tg\"}" "${wa:+\"$wa\"}"
    echo '  channels: {'
    [[ -n "$tg" ]] && printf '    telegram: { dmPolicy: "allowlist", allowFrom: ["%s"], groupPolicy: "disabled" },\n' "$tg"
    [[ -n "$wa" ]] && printf '    whatsapp: { dmPolicy: "allowlist", allowFrom: ["%s"], groupPolicy: "disabled" },\n' "$wa"
    echo '  },'
    printf '  commands: { ownerAllowFrom: [%s] },\n' \
      "$(printf '%s' "${tg:+\"telegram:$tg\"}${tg:+${wa:+,}}${wa:+\"whatsapp:$wa\"}")"
    if [[ -n "$to" ]]; then
      printf '  cron: { failureAlert: { enabled: true, after: 1, mode: "announce", channel: "%s", to: "%s" } },\n' "$ch" "$to"
    fi
    echo '}'
  } > "$patch"
  oc config patch --file "$patch" >/dev/null
  rm -f "$patch"
}
