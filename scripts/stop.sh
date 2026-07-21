#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f logs/rayoboss.pid ]]; then echo "No hay PID registrado."; exit 0; fi
PID="$(cat logs/rayoboss.pid)"
if ! kill -0 "$PID" 2>/dev/null; then rm -f logs/rayoboss.pid; echo "El proceso ya no existia."; exit 0; fi
kill -TERM "$PID"
for _ in {1..20}; do
  if ! kill -0 "$PID" 2>/dev/null; then rm -f logs/rayoboss.pid; echo "Detenido limpiamente."; exit 0; fi
  sleep 0.25
done
kill -KILL "$PID" 2>/dev/null || true
rm -f logs/rayoboss.pid
echo "El proceso no cerro a tiempo y fue terminado forzosamente."
