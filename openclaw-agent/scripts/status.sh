#!/usr/bin/env bash
# Read-only diagnostics (run as the openclaw user). Prints no secrets.
source "$(dirname "$0")/lib.sh"
require_agent_user
section() { printf '\n\033[1m## %s\033[0m\n' "$*"; }
section "Versions";        oc --version; node --version; gog --version 2>/dev/null || true
section "Gateway";         oc gateway status 2>&1 | grep -E "Listening|Connectivity|Gateway version" || true
section "Service";         systemctl --user --no-pager --lines=0 status openclaw-gateway.service 2>&1 | head -5 || true
section "Model";           oc config get agents.defaults.model 2>/dev/null | tr -d '\n '; echo
                           echo "route: $(env_get AI_ROUTE)  token created: $(env_get AI_TOKEN_CREATED)"
                           oc models auth list --provider anthropic 2>/dev/null | grep -E "anthropic:" | sed -E 's/sk-ant-[A-Za-z0-9_-]+/***/g' || true
section "Channels";        oc channels status --probe 2>&1 | tail -n 12 || true
section "Telegram policy"; oc config get channels.telegram.dmPolicy 2>/dev/null; oc config get channels.telegram.allowFrom 2>/dev/null | tr -d '\n '; echo
section "Google (gog)";    if [[ -n "$(env_get GOG_ACCOUNT)" ]]; then
                             GOG_KEYRING_BACKEND=file GOG_KEYRING_PASSWORD="$(env_get GOG_KEYRING_PASSWORD)" gog auth list --check 2>&1 | sed -E 's/[A-Za-z0-9._%+-]+@/***@/' | tail -5
                           else echo "not connected (scripts/google-auth.sh)"; fi
section "MCP";             oc mcp doctor 2>&1 | tail -n 4 || true
section "Automations";     oc automations list --all 2>&1 | cut -c1-160 || true
section "Usage / cost (estimated, last sessions)"; oc sessions list 2>&1 | head -n 12 || true
section "Security audit";  oc security audit 2>&1 | grep -E "Summary|CRITICAL|critical" | head -5 || true
section "Listening ports"; ss -ltn 2>/dev/null | awk 'NR>1{print $4}' | sort -u
section "Backups";         ls -1t "${BACKUP_DIR:-/var/backups/openclaw}" 2>/dev/null | head -3 || true
section "Disk";            df -h / | tail -1
section "Recent errors";   journalctl --user -u openclaw-gateway --since "24 hours ago" -p err --no-pager 2>/dev/null | tail -n 10 || true
