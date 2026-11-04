#!/usr/bin/env bash
# Run on YOUR laptop (not the server). Opens the Control UI securely through SSH:
#   ./tunnel.sh <server-ip>      then browse to http://127.0.0.1:18789/
# The gateway port is never exposed to the internet; only SSH (key-based) is.
set -euo pipefail
host="${1:?usage: tunnel.sh <server-ip>}"
echo "Control UI: http://127.0.0.1:18789/   (Ctrl+C to close the tunnel)"
echo "First time: on the server run 'agent dashboard' for the tokenized URL,"
echo "            then 'agent devices list' / 'agent devices approve <id>' to approve this browser."
exec ssh -N -L 18789:127.0.0.1:18789 "root@$host"
