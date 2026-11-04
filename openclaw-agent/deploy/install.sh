#!/usr/bin/env bash
# One-shot, idempotent server bootstrap for the personal OpenClaw agent.
# Target: fresh Ubuntu 24.04 LTS - Oracle Cloud Always Free (A1, arm64) or any VPS. Run as root:
#   KIT_REF=<branch-or-commit> bash install.sh
# Usually executed automatically by deploy/cloud-init.yaml.
set -euo pipefail

KIT_REPO="${KIT_REPO:-https://github.com/shaharkimg/magalim-israel.git}"
KIT_REF="${KIT_REF:-main}"
KIT_ROOT=/opt/agent-kit
KIT="$KIT_ROOT/openclaw-agent"
OPENCLAW_VERSION="${OPENCLAW_VERSION:-2026.10.10}"
GOG_VERSION="${GOG_VERSION:-0.47.1}"
CLAUDE_CODE_VERSION="${CLAUDE_CODE_VERSION:-2.1.318}"
NODE_MAJOR=24
AGENT_USER=openclaw

log() { printf '\n[%s] === %s\n' "$(date '+%F %T')" "$*"; }
[[ $EUID -eq 0 ]] || { echo "run as root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

log "Base system: timezone, updates, packages"
timedatectl set-timezone Asia/Jerusalem || ln -sf /usr/share/zoneinfo/Asia/Jerusalem /etc/localtime
apt-get update -y
apt-get -y -o Dpkg::Options::=--force-confold upgrade
apt-get install -y ca-certificates curl gnupg git jq sqlite3 python3 ufw fail2ban \
  unattended-upgrades apt-listchanges age

log "Automatic security updates (reboot window 04:30 if required)"
cat > /etc/apt/apt.conf.d/52openclaw-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

is_oci() { grep -qi "oraclecloud" /sys/class/dmi/id/chassis_asset_tag 2>/dev/null || grep -qs "InstanceServices" /etc/iptables/rules.v4; }
if is_oci; then
  log "Oracle Cloud detected: keeping Oracle's built-in iptables (inbound: SSH only). Not enabling UFW."
  iptables -S INPUT | head -20 || true
else
  log "Firewall: deny all inbound except SSH (rate-limited). Gateway stays on 127.0.0.1."
  ufw default deny incoming
  ufw default allow outgoing
  ufw limit OpenSSH
  ufw --force enable
fi
systemctl enable --now fail2ban

log "SSH hardening (only if key-based root login is already configured)"
if [[ -s /root/.ssh/authorized_keys ]]; then
  cat > /etc/ssh/sshd_config.d/10-openclaw-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
AllowTcpForwarding local
X11Forwarding no
MaxAuthTries 3
EOF
  sshd -t && systemctl reload ssh || true
else
  echo "WARNING: /root/.ssh/authorized_keys is empty - password SSH left as-is. Add an SSH key and re-run."
fi

log "Persistent, size-capped journald logs"
mkdir -p /etc/systemd/journald.conf.d /var/log/journal
cat > /etc/systemd/journald.conf.d/10-openclaw.conf <<'EOF'
[Journal]
Storage=persistent
SystemMaxUse=500M
MaxRetentionSec=1month
EOF
systemctl restart systemd-journald

log "Node.js $NODE_MAJOR (NodeSource signed apt repo)"
if ! node --version 2>/dev/null | grep -q "^v$NODE_MAJOR\."; then
  install -d -m 755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y && apt-get install -y nodejs
fi
node --version

log "OpenClaw $OPENCLAW_VERSION (official npm package, root-owned: the agent user cannot modify it)"
if [[ "$(openclaw --version 2>/dev/null | awk '{print $2}')" != "$OPENCLAW_VERSION" ]]; then
  npm install -g --allow-scripts=@google/genai,esbuild,protobufjs,openclaw "openclaw@$OPENCLAW_VERSION"
fi
openclaw --version

log "Claude Code CLI $CLAUDE_CODE_VERSION (only used to create the Claude-subscription token: agent ai claude)"
if [[ "$(claude --version 2>/dev/null | awk '{print $1}')" != "$CLAUDE_CODE_VERSION" ]]; then
  npm install -g --allow-scripts=@anthropic-ai/claude-code "@anthropic-ai/claude-code@$CLAUDE_CODE_VERSION"
fi
claude --version || true

log "gogcli $GOG_VERSION (GitHub release, SHA-256 verified)"
if [[ "$(gog --version 2>/dev/null)" != "v$GOG_VERSION" ]]; then
  arch="$(dpkg --print-architecture)"   # amd64 | arm64
  tmp="$(mktemp -d)"; base="https://github.com/openclaw/gogcli/releases/download/v$GOG_VERSION"
  tarball="gogcli_${GOG_VERSION}_linux_${arch}.tar.gz"
  curl -fsSL -o "$tmp/$tarball" "$base/$tarball"
  curl -fsSL -o "$tmp/checksums.txt" "$base/checksums.txt"
  (cd "$tmp" && grep " $tarball\$" checksums.txt | sha256sum -c -)
  tar -xzf "$tmp/$tarball" -C "$tmp"
  gogbin="$(find "$tmp" -type f -name gog -perm -u+x | head -1)"
  [[ -n "$gogbin" ]] || { echo "gog binary not found in $tarball"; exit 1; }
  install -m 755 "$gogbin" /usr/local/bin/gog
  rm -rf "$tmp"
fi
gog --version

log "Agent kit ($KIT_REF) -> $KIT_ROOT (read-only for the agent user)"
if [[ ! -d "$KIT_ROOT/.git" ]]; then
  git clone --filter=blob:none --no-checkout "$KIT_REPO" "$KIT_ROOT"
  git -C "$KIT_ROOT" sparse-checkout set openclaw-agent
fi
git -C "$KIT_ROOT" fetch --depth 1 origin "$KIT_REF"
git -C "$KIT_ROOT" checkout -q --force FETCH_HEAD
chown -R root:root "$KIT_ROOT"; chmod -R go-w "$KIT_ROOT"; chmod -R a+rX "$KIT_ROOT"

log "Dedicated non-root user: $AGENT_USER"
id "$AGENT_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$AGENT_USER"
chmod 700 "/home/$AGENT_USER"
loginctl enable-linger "$AGENT_USER"
uid="$(id -u "$AGENT_USER")"
for _ in $(seq 1 30); do [[ -S /run/user/$uid/bus ]] && break; sleep 1; done
as_agent() { runuser -u "$AGENT_USER" -- env HOME="/home/$AGENT_USER" XDG_RUNTIME_DIR="/run/user/$uid" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" TZ=Asia/Jerusalem bash -lc "$*"; }

log "OpenClaw onboarding (no secrets yet) + hardened config"
if [[ ! -f "/home/$AGENT_USER/.openclaw/openclaw.json" ]]; then
  as_agent "openclaw onboard --non-interactive --accept-risk --mode local --auth-choice skip \
    --secret-input-mode ref --gateway-bind loopback --skip-daemon --skip-health --skip-channels \
    --skip-skills --skip-search --skip-ui"
fi
as_agent "$KIT/scripts/apply-config.sh --no-restart"

log "Gateway as a systemd user service (auto-start on boot, auto-restart on crash)"
as_agent "openclaw gateway install --force"
dropin="/home/$AGENT_USER/.config/systemd/user/openclaw-gateway.service.d"
mkdir -p "$dropin"
cat > "$dropin/10-host.conf" <<'EOF'
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Environment=TZ=Asia/Jerusalem
TimeoutStartSec=90
Restart=always
RestartSec=5
EOF
chown -R "$AGENT_USER:$AGENT_USER" "/home/$AGENT_USER/.config"
as_agent "systemctl --user daemon-reload && systemctl --user enable openclaw-gateway.service && systemctl --user restart openclaw-gateway.service"

log "System timers: daily backup 03:30, health check every 10 min"
install -m 644 "$KIT/deploy/systemd/openclaw-backup.service" /etc/systemd/system/
install -m 644 "$KIT/deploy/systemd/openclaw-backup.timer" /etc/systemd/system/
install -m 644 "$KIT/deploy/systemd/openclaw-health.service" /etc/systemd/system/
install -m 644 "$KIT/deploy/systemd/openclaw-health.timer" /etc/systemd/system/
install -d -m 700 -o "$AGENT_USER" -g "$AGENT_USER" /var/backups/openclaw
systemctl daemon-reload
systemctl enable --now openclaw-backup.timer openclaw-health.timer

log "Convenience command: /usr/local/bin/agent"
ln -sf "$KIT/scripts/agent" /usr/local/bin/agent

log "Verification"
sleep 10
as_agent "openclaw gateway status" | grep -E "Listening|Connectivity" || true
ss -ltnp | grep 18789 || true
if is_oci; then iptables -S INPUT | head -12; else ufw status verbose | head -12; fi
echo
echo "DONE. Next:  sudo agent setup     # guided: AI (your Claude subscription), WhatsApp QR, Google, tasks"
echo "             sudo agent status"
