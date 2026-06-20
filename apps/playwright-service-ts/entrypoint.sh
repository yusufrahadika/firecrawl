#!/bin/bash
set -e

PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}

trap 'cleanup; exit 0' SIGINT SIGTERM SIGHUP
trap 'cleanup' EXIT

DEPTH="${XVFB_DEPTH:-24}"
TARGET_RES="${XVFB_RESOLUTION:-1920x1080}"
XVFB_DISPLAY="${XVFB_DISPLAY:-:99}"
XVFB_PID=""

is_pid_alive() {
  [ -n "$1" ] && kill -0 "$1" 2>/dev/null
}

cleanup_display_lock() {
  local display_num="${XVFB_DISPLAY##*:}"
  display_num="${display_num%%.*}"
  local lock_file="/tmp/.X${display_num}-lock"

  if [ -f "$lock_file" ]; then
    local lock_pid
    lock_pid="$(tr -cd '0-9' <"$lock_file" 2>/dev/null || true)"
    local is_stale=1

    if [ -n "$lock_pid" ] && kill -0 "$lock_pid" 2>/dev/null; then
      local proc_name
      proc_name="$(cat "/proc/$lock_pid/comm" 2>/dev/null || true)"
      if [ "$proc_name" = "Xvfb" ] || [ "$proc_name" = "X" ]; then
        is_stale=0
      fi
    fi

    if [ "$is_stale" -eq 1 ]; then
      echo "Removing stale X lock for ${XVFB_DISPLAY}"
      rm -f "$lock_file" "/tmp/.X11-unix/X${display_num}"
    fi
  fi
}

start_xvfb() {
  cleanup_display_lock
  echo "Starting Xvfb on ${XVFB_DISPLAY} with resolution ${TARGET_RES}x${DEPTH}"
  Xvfb "$XVFB_DISPLAY" -screen 0 "${TARGET_RES}x${DEPTH}" -ac +extension GLX +render -noreset &
  XVFB_PID=$!
  export DISPLAY="$XVFB_DISPLAY"
  sleep 0.5
}

stop_pid() {
  local pid="$1"
  local count=0

  if is_pid_alive "$pid"; then
    kill "$pid" 2>/dev/null || true
    while is_pid_alive "$pid" && [ "$count" -lt 30 ]; do
      sleep 0.1
      count=$((count + 1))
    done
    if is_pid_alive "$pid"; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
}

monitor_display() {
  trap 'exit 0' INT TERM
  trap 'stop_pid "$XVFB_PID"' EXIT

  while true; do
    sleep 5 &
    wait $! || true
    if ! is_pid_alive "$XVFB_PID"; then
      echo "Xvfb on ${XVFB_DISPLAY} stopped; restarting it"
      start_xvfb
    fi
  done
}

if [ "${ENABLE_XVFB:-true}" = "true" ] && { [ -z "${DISPLAY:-}" ] || [ "$DISPLAY" = "$XVFB_DISPLAY" ]; }; then
  start_xvfb
  monitor_display &
  PIDS+=("$!")
fi

echo "Starting Playwright service with BROWSER_VARIANT=${BROWSER_VARIANT:-playwright}"
"$@" &
SERVICE_PID=$!
PIDS+=("$SERVICE_PID")

wait "$SERVICE_PID"
