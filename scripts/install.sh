#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "Instala Node.js 22.x."; exit 1; }
MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[[ "$MAJOR" == "22" ]] || { echo "Se requiere Node.js 22.x; actual: $(node -v)."; exit 1; }
if [[ ! -f .env && ! -f /etc/rayoboss.env ]]; then
  echo "Falta configuración. En Windows ejecuta: bash scripts/generate-env.sh"
  echo "En VPS crea /etc/rayoboss.env y usa systemd."
  exit 1
fi
npm ci
npm run build
npm test
npm audit --omit=dev
mkdir -p data logs backups
chmod 700 data logs backups 2>/dev/null || true
if [[ -f .env ]]; then node scripts/doctor.js; fi
echo "Instalación verificada."
