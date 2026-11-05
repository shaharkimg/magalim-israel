#!/usr/bin/env bash
# Run on YOUR laptop (not the server). Opens the Control UI securely through SSH:
#   ./tunnel.sh ubuntu@<server-ip>     (Oracle Cloud)   or   ./tunnel.sh root@<server-ip>
# then browse to http://127.0.0.1:18789/
# The gateway port is never exposed to the internet; only SSH (key-based) is.
set -euo pipefail
target="${1:?usage: tunnel.sh <user@server-ip>}"
[[ "$target" == *@* ]] || target="ubuntu@$target"
echo "Control UI: http://127.0.0.1:18789/   (Ctrl+C to close the tunnel)"
echo "First time: on the server run 'sudo agent dashboard' for the tokenized URL,"
echo "            then 'sudo agent devices list' / 'sudo agent devices approve <id>'."
exec ssh -N -L 18789:127.0.0.1:18789 "$target"
