#!/usr/bin/env bash
# Connect WhatsApp: the agent runs on a DEDICATED number (your second SIM) and
# answers ONLY your personal number.
#
#   whatsapp-setup.sh <your-personal-number>     e.g. +972501234567
#   whatsapp-setup.sh --relink                   show a new QR (same owner)
#
# Before running: WhatsApp (or WhatsApp Business) must be active on a phone with
# the second SIM. Keep that phone online at least every few days.
source "$(dirname "$0")/lib.sh"
require_agent_user

if [[ "${1:-}" != "--relink" ]]; then
  owner="$(normalize_e164 "${1:-}")" || die "usage: $0 <your personal number, e.g. +972501234567>"
  env_set WHATSAPP_OWNER "$owner"
  [[ -n "$(env_get PRIMARY_CHANNEL)" ]] || env_set PRIMARY_CHANNEL whatsapp
fi
owner="$(env_get WHATSAPP_OWNER)"; [[ -n "$owner" ]] || die "owner number not set"

ensure_whatsapp_plugin
info "Applying WhatsApp config locked to $owner"
"$KIT_DIR/scripts/apply-config.sh" --no-restart >/dev/null

cat <<EOF

=== Link the AGENT's WhatsApp number (the second SIM, NOT your personal number) ===
On the phone that runs WhatsApp with the second SIM:
  WhatsApp -> Settings (⋮) -> Linked devices -> Link a device -> scan the QR below.
Widen this terminal window first; the QR is refreshed every ~20 seconds.

EOF
oc channels login --channel whatsapp
oc channels status --probe 2>&1 | grep -iA3 whatsapp || true
cat <<EOF

Done. From your personal WhatsApp ($owner), open a chat with the agent's number and say "שלום".
Messages from any other number are ignored; the agent can only send to $owner.
EOF
