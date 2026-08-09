#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "RayoBoss - preparación inicial para Windows desde Git Bash"
command -v git >/dev/null || { echo "Falta Git para Windows."; exit 1; }
command -v node >/dev/null || { echo "Falta Node.js 24.x LTS."; exit 1; }
command -v corepack >/dev/null || { echo "Falta Corepack para activar pnpm."; exit 1; }

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[[ "$NODE_MAJOR" == "24" ]] || { echo "Se requiere Node.js 24.x; versión actual: $(node -v)."; exit 1; }
corepack enable

if [[ ! -f .env ]]; then
  bash scripts/generate-env.sh
  echo
  echo "Guarda la contraseña mostrada antes de continuar."
else
  echo "Se conserva el archivo .env existente."
fi

pnpm install --frozen-lockfile
pnpm run verify

echo
echo "Preparación terminada. Inicia con: pnpm start"
echo "Después abre: http://localhost:3000"
