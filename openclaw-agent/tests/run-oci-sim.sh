#!/usr/bin/env bash
# Offline test of deploy/oci-cloudshell.sh against a simulated OCI CLI.
# Needs: python3 with the `jmespath` package (pip install jmespath), ssh-keygen, curl (fetches cloud-init.yaml from GitHub).
set -uo pipefail
T="$(cd "$(dirname "$0")" && pwd)"; W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
mkdir -p "$W/bin" "$W/home"
PY="${PYTHON:-python3}"
printf '#!/bin/bash\nexec %s -I %s "$@"\n' "$PY" "$T/oci-sim.py" > "$W/bin/oci"; chmod +x "$W/bin/oci"
run() { env -i PATH="$W/bin:/usr/bin:/bin" HOME="$W/home" OCI_TENANCY=ocid1.tenancy.oc1..test SIM_STATE_DIR="$W" \
  HTTPS_PROXY="${HTTPS_PROXY:-}" https_proxy="${HTTPS_PROXY:-}" "$@" bash "$T/../deploy/oci-cloudshell.sh" 2>&1 | sed 's/\x1b\[[0-9;]*m//g'; }
pass=0; fail=0; ok(){ echo "PASS  $*"; pass=$((pass+1)); }; bad(){ echo "FAIL  $*"; fail=$((fail+1)); }
o="$(run)";                       grep -q "Server ready: openclaw-agent" <<<"$o" && grep -q "trying .*AD-2" <<<"$o" && ok "creates server; retries next AD on 'Out of host capacity'" || { bad "create"; echo "$o"; }
o="$(run)";                       grep -q "already exists - reusing" <<<"$o" && [[ $(grep -c "compute instance launch" "$W/calls.log") -eq 2 ]] && ok "idempotent re-run (no second server)" || bad "idempotent"
rm -f "$W/state.json"
o="$(run SIM_NO_CAPACITY=1 RETRY_MINUTES=0)"; grep -q "no free A1 capacity right now" <<<"$o" && ok "clear message when no capacity anywhere" || { bad "no-capacity"; echo "$o"; }
echo "RESULT: $pass passed, $fail failed"; [[ $fail -eq 0 ]]
