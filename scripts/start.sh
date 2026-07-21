#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
if [[ -f logs/rayoboss.pid ]]; then
  PID="$(cat logs/rayoboss.pid)"
  if kill -0 "$PID" 2>/dev/null; then
    echo "RayoBoss ya esta en ejecucion (PID $PID)."
    exit 1
  fi
  rm -f logs/rayoboss.pid
fi
nohup node server.js >> logs/rayoboss.log 2>&1 &
PID=$!
echo "$PID" > logs/rayoboss.pid
sleep 1
if ! kill -0 "$PID" 2>/dev/null; then
  echo "RayoBoss no pudo iniciar. Revisa logs/rayoboss.log"
  exit 1
fi
echo "RayoBoss iniciado (PID $PID) en puerto ${PORT:-3000}."
