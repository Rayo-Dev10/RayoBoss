#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ARCHIVE="${1:-}"
[[ -f "$ARCHIVE" ]] || { echo "Uso: bash scripts/restore.sh backups/archivo.tar.gz"; exit 1; }
if [[ -f "${ARCHIVE}.sha256" ]]; then sha256sum -c "${ARCHIVE}.sha256"; fi
while IFS= read -r entry; do
  [[ "$entry" == data/state.json || "$entry" == data/state.json.bak ]] || { echo "Entrada no permitida en el respaldo: $entry"; exit 1; }
done < <(tar -tzf "$ARCHIVE")
mkdir -p data
if [[ -f data/state.json ]]; then cp -p data/state.json "data/state.pre-restore-$(date +%Y%m%d-%H%M%S).json"; fi
tar -xzf "$ARCHIVE"
chmod 600 data/state.json data/state.json.bak 2>/dev/null || true
echo "Datos restaurados. Reinicia RayoBoss y ejecuta npm test."
