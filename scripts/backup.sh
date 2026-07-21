#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
[[ -f data/state.json ]] || { echo "No existe data/state.json para respaldar."; exit 1; }
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="backups/rayoboss-data-${STAMP}.tar.gz"
tar -czf "$ARCHIVE" data/state.json data/state.json.bak 2>/dev/null || tar -czf "$ARCHIVE" data/state.json
sha256sum "$ARCHIVE" > "${ARCHIVE}.sha256"
chmod 600 "$ARCHIVE" "${ARCHIVE}.sha256"
echo "Respaldo creado: $ARCHIVE"
