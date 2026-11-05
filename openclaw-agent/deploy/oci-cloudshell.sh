#!/usr/bin/env bash
# Create the agent's server on Oracle Cloud Always Free - run it in OCI Cloud Shell
# (Oracle Console -> the ">_" Cloud Shell icon at the top right), where the OCI CLI
# is already signed in as you. One paste:
#
#   curl -fsSL https://raw.githubusercontent.com/shaharkimg/magalim-israel/ccr-ce28a98b-d5v973/openclaw-agent/deploy/oci-cloudshell.sh | bash
#
# What it creates (all Always Free eligible, nothing billable):
#   VCN 10.0.0.0/16 + internet gateway + public subnet (default security list: SSH only)
#   1 x VM.Standard.A1.Flex  1 OCPU / 4 GB  Ubuntu 24.04 (arm64), ~47 GB boot volume
#   cloud-init = deploy/cloud-init.yaml  (installs and hardens the agent automatically)
# Idempotent: re-running reuses what exists. Retries automatically on "Out of host capacity".
set -euo pipefail

KIT_REF="${KIT_REF:-ccr-ce28a98b-d5v973}"
RAW="https://raw.githubusercontent.com/shaharkimg/magalim-israel/$KIT_REF/openclaw-agent"
NAME="openclaw-agent"
SHAPE="VM.Standard.A1.Flex"; OCPUS=1; MEM_GB=4
RETRY_MINUTES="${RETRY_MINUTES:-15}"
KEY="$HOME/.ssh/openclaw_agent_ed25519"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
command -v oci >/dev/null || die "run this inside OCI Cloud Shell (oci CLI not found)"

T="${OCI_TENANCY:-${OCI_CLI_TENANCY:-}}"
[[ -n "$T" ]] || die "tenancy OCID not found (OCI_TENANCY). Are you in OCI Cloud Shell?"
HOME_REGION="$(oci iam region-subscription list --tenancy-id "$T" \
  --query 'data[?"is-home-region"]."region-name" | [0]' --raw-output)"
[[ -n "$HOME_REGION" && "$HOME_REGION" != null ]] || die "could not determine home region"
R=(--region "$HOME_REGION")
say "Tenancy home region: $HOME_REGION (Always Free compute must be in the home region)"

existing="$(oci compute instance list "${R[@]}" --compartment-id "$T" --display-name "$NAME" \
  --query 'data[?"lifecycle-state"!=`TERMINATED`].id | [0]' --raw-output 2>/dev/null || true)"

if [[ -z "$existing" || "$existing" == null ]]; then
  say "SSH key for the server (kept in your Cloud Shell home)"
  mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh"
  [[ -f "$KEY" ]] || ssh-keygen -q -t ed25519 -N "" -C "$NAME" -f "$KEY"

  say "Network (VCN, internet gateway, public subnet)"
  VCN="$(oci network vcn list "${R[@]}" --compartment-id "$T" --display-name "$NAME-vcn" \
    --query 'data[0].id' --raw-output 2>/dev/null || true)"
  if [[ -z "$VCN" || "$VCN" == null ]]; then
    VCN="$(oci network vcn create "${R[@]}" --compartment-id "$T" --display-name "$NAME-vcn" \
      --cidr-blocks '["10.0.0.0/16"]' --dns-label openclawvcn --wait-for-state AVAILABLE \
      --query 'data.id' --raw-output)"
  fi
  IGW="$(oci network internet-gateway list "${R[@]}" --compartment-id "$T" --vcn-id "$VCN" \
    --query 'data[0].id' --raw-output 2>/dev/null || true)"
  if [[ -z "$IGW" || "$IGW" == null ]]; then
    IGW="$(oci network internet-gateway create "${R[@]}" --compartment-id "$T" --vcn-id "$VCN" \
      --is-enabled true --display-name "$NAME-igw" --wait-for-state AVAILABLE \
      --query 'data.id' --raw-output)"
  fi
  RT="$(oci network vcn get "${R[@]}" --vcn-id "$VCN" --query 'data."default-route-table-id"' --raw-output)"
  oci network route-table update "${R[@]}" --rt-id "$RT" --force \
    --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW\"}]" >/dev/null
  SUB="$(oci network subnet list "${R[@]}" --compartment-id "$T" --vcn-id "$VCN" \
    --query 'data[0].id' --raw-output 2>/dev/null || true)"
  if [[ -z "$SUB" || "$SUB" == null ]]; then
    SUB="$(oci network subnet create "${R[@]}" --compartment-id "$T" --vcn-id "$VCN" \
      --cidr-block 10.0.0.0/24 --display-name "$NAME-subnet" --dns-label openclawsub \
      --wait-for-state AVAILABLE --query 'data.id' --raw-output)"
  fi

  say "Ubuntu 24.04 (arm64) image"
  IMG="$(oci compute image list "${R[@]}" --compartment-id "$T" --operating-system "Canonical Ubuntu" \
    --operating-system-version "24.04" --shape "$SHAPE" --sort-by TIMECREATED --sort-order DESC \
    --query 'data[?!contains("display-name", `Minimal`)] | [0].id' --raw-output)"
  [[ -n "$IMG" && "$IMG" != null ]] || die "no Ubuntu 24.04 image for $SHAPE in $HOME_REGION"

  say "Cloud-init (automatic installation of the agent)"
  CI="$(mktemp)"; curl -fsSL "$RAW/deploy/cloud-init.yaml" -o "$CI"
  grep -q '^#cloud-config' "$CI" || die "could not download cloud-init.yaml"

  mapfile -t ADS < <(oci iam availability-domain list "${R[@]}" --compartment-id "$T" --query 'data[].name' --raw-output | tr -d '[]", ' | grep -v '^$')
  say "Creating $SHAPE ($OCPUS OCPU / ${MEM_GB}GB) - free tier capacity can be scarce; retrying up to $RETRY_MINUTES min"
  deadline=$(( $(date +%s) + RETRY_MINUTES * 60 ))
  while :; do
    for AD in "${ADS[@]}"; do
      echo "   trying $AD ..."
      if out="$(oci compute instance launch "${R[@]}" --compartment-id "$T" --availability-domain "$AD" \
            --shape "$SHAPE" --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEM_GB}" \
            --image-id "$IMG" --subnet-id "$SUB" --assign-public-ip true --display-name "$NAME" \
            --ssh-authorized-keys-file "$KEY.pub" --user-data-file "$CI" \
            --wait-for-state RUNNING --max-wait-seconds 900 --query 'data.id' --raw-output 2>&1)"; then
        existing="$(grep -oE 'ocid1\.instance\.[a-z0-9._-]+' <<<"$out" | tail -1)"; break 2
      fi
      if grep -qiE "out of (host )?capacity|InternalError|TooManyRequests" <<<"$out"; then continue; fi
      if grep -qiE "LimitExceeded|QuotaExceeded" <<<"$out"; then die "Always Free limit reached (another A1 instance exists?): $out"; fi
      die "$out"
    done
    (( $(date +%s) < deadline )) || die "Oracle has no free A1 capacity right now. Re-run this same command later (it resumes)."
    echo "   no capacity yet - waiting 60s"; sleep 60
  done
  rm -f "$CI"
else
  say "Instance $NAME already exists - reusing it"
fi

IP="$(oci compute instance list-vnics "${R[@]}" --instance-id "$existing" --query 'data[0]."public-ip"' --raw-output)"
cat <<EOF

$(printf '\033[32m')Server ready: $NAME  ($SHAPE $OCPUS OCPU / ${MEM_GB}GB, $HOME_REGION)$(printf '\033[0m')
Public IP: $IP

The agent installs itself now (~10 minutes). From THIS Cloud Shell:
  ssh -i $KEY ubuntu@$IP 'tail -n 3 /var/log/openclaw-install.log'    # wait for OPENCLAW-INSTALL-OK
  ssh -t -i $KEY ubuntu@$IP sudo agent setup                            # then the guided setup
(The first ssh asks to trust the server fingerprint: type yes.)
EOF
