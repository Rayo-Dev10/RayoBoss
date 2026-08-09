#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "Instala Node.js 24.x LTS."; exit 1; }
MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[[ "$MAJOR" == "24" ]] || { echo "Se requiere Node.js 24.x; actual: $(node -v)."; exit 1; }
command -v corepack >/dev/null || { echo "Corepack es obligatorio para activar pnpm 10.34.5."; exit 1; }
corepack enable
if [[ ! -f .env && ! -f /etc/rayoboss.env ]]; then
  echo "Falta configuración. En Windows ejecuta: bash scripts/generate-env.sh"
  echo "En VPS crea /etc/rayoboss.env y usa systemd."
  exit 1
fi
pnpm install --frozen-lockfile
pnpm run verify
mkdir -p data logs backups
chmod 700 data logs backups 2>/dev/null || true
if [[ -f .env ]]; then pnpm run doctor; fi
echo "Instalación verificada."
