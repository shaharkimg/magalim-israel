#!/usr/bin/env bash
# Switch the primary model.  set-model.sh opus|sonnet|haiku|<provider/model>
source "$(dirname "$0")/lib.sh"
require_agent_user
case "${1:-}" in
  opus)   primary="anthropic/claude-opus-5-5";   fallback="anthropic/claude-sonnet-5-5" ;;
  sonnet) primary="anthropic/claude-sonnet-5-5"; fallback="anthropic/claude-opus-5-5" ;;
  haiku)  red "Warning: small models are more vulnerable to prompt injection from emails."
          primary="anthropic/claude-haiku-5-5";  fallback="anthropic/claude-sonnet-5-5" ;;
  */*)    primary="$1"; fallback="${2:-anthropic/claude-sonnet-5-5}" ;;
  *) die "usage: $0 opus|sonnet|haiku|<provider/model> [fallback]" ;;
esac
patch="$(mktemp --suffix=.json5)"
printf '{ agents: { defaults: { model: { primary: "%s", fallbacks: ["%s"] } } } }\n' "$primary" "$fallback" > "$patch"
oc config patch --file "$patch"; rm -f "$patch"
green "Primary model: $primary (fallback: $fallback)"
