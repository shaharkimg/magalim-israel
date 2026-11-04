#!/usr/bin/env bash
# Apply the hardened base config + managed workspace files. Idempotent.
# Optional patches are applied only when their secrets already exist.
source "$(dirname "$0")/lib.sh"
require_agent_user

info "Validating and applying config/openclaw.base.json5"
oc config patch --file "$KIT_DIR/config/openclaw.base.json5" --dry-run >/dev/null
oc config patch --file "$KIT_DIR/config/openclaw.base.json5"

if store_has ANTHROPIC_API_KEY; then
  info "ANTHROPIC_API_KEY present -> applying anthropic.patch.json5"
  oc config patch --file "$KIT_DIR/config/anthropic.patch.json5"
fi
tmp="$(mktemp -p "$OC_TMPDIR" --suffix=.json5)"
if store_has TELEGRAM_BOT_TOKEN; then
  info "TELEGRAM_BOT_TOKEN present -> enabling Telegram"
  oc config patch --file "$KIT_DIR/config/telegram.patch.json5"
  # Before the owner is known: pairing (strangers only get their id, no agent access).
  [[ -n "$(env_get TELEGRAM_OWNER_ID)" ]] || { echo '{ channels: { telegram: { dmPolicy: "pairing" } } }' > "$tmp"; oc config patch --file "$tmp"; }
else
  echo '{ channels: { telegram: { enabled: false, dmPolicy: "pairing" } } }' > "$tmp"; oc config patch --file "$tmp"
fi
rm -f "$tmp"
if [[ -n "$(env_get WHATSAPP_OWNER)" ]]; then
  info "WHATSAPP_OWNER set -> enabling WhatsApp (dedicated number, owner-only)"
  ensure_whatsapp_plugin
  oc config patch --file "$KIT_DIR/config/whatsapp.patch.json5"
fi
info "Outbound guard + owner policies (allowlists, owner commands, failure alerts)"
ensure_guard_plugin
sync_owner_policies
if [[ -n "$(env_get GOG_ACCOUNT)" && -n "$(env_get GOG_KEYRING_PASSWORD)" ]]; then
  info "Google account configured -> applying google-mcp.patch.json5"
  set -a; source "$OC_ENV_FILE"; set +a
  oc config patch --file "$KIT_DIR/config/google-mcp.patch.json5"
fi

info "Syncing workspace files"
mkdir -p "$OC_WORKSPACE/memory"
stamp="$(date +%Y%m%d-%H%M%S)"
# Managed by the kit (overwritten, previous copy kept as .bak-<stamp>):
for f in AGENTS.md SOUL.md IDENTITY.md; do
  if [[ -f "$OC_WORKSPACE/$f" ]] && ! cmp -s "$KIT_DIR/workspace/$f" "$OC_WORKSPACE/$f"; then
    cp -p "$OC_WORKSPACE/$f" "$OC_WORKSPACE/.$f.bak-$stamp"
  fi
  install -m 600 "$KIT_DIR/workspace/$f" "$OC_WORKSPACE/$f"
done
# Owned by the agent/owner (seeded once, never overwritten):
for f in USER.md MEMORY.md; do
  if [[ ! -f "$OC_WORKSPACE/$f" ]] || grep -q "Replace the example below" "$OC_WORKSPACE/$f" 2>/dev/null; then
    install -m 600 "$KIT_DIR/workspace/$f" "$OC_WORKSPACE/$f"
  fi
done
rm -f "$OC_WORKSPACE/BOOTSTRAP.md"

oc config validate
green "Config applied."
[[ "${1:-}" == "--no-restart" ]] || restart_gateway
