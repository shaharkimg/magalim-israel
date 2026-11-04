#!/usr/bin/env bash
# Keep the test mocks running (restart on crash). Test-only helper.
#   tests/mock-supervise.sh start|stop
D="$(cd "$(dirname "$0")" && pwd)"; LOG="${MOCK_LOG:-$HOME/mock-model.log}"
case "${1:-start}" in
  start)
    pgrep -u "$(id -u)" -f "mock-supervise-loop" >/dev/null && exit 0
    (exec -a mock-supervise-loop bash -c "while true; do node '$D/mock-model.mjs' 18999 '$LOG'; sleep 1; done" >/dev/null 2>&1 &)
    (exec -a mock-supervise-loop bash -c "while true; do node '$D/mock-telegram.mjs' 18998; sleep 1; done" >/dev/null 2>&1 &)
    for _ in $(seq 1 20); do curl -s -m 1 http://127.0.0.1:18999/v1/models >/dev/null && curl -s -m 1 http://127.0.0.1:18998/__sent >/dev/null && exit 0; sleep 0.5; done; exit 1 ;;
  stop)
    pkill -u "$(id -u)" -f "mock-supervise-loop"; pkill -u "$(id -u)" -f "$D/mock-model.mjs"; pkill -u "$(id -u)" -f "$D/mock-telegram.mjs"; true ;;
esac
