#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-}"
TARGETS=(
  node_modules
  data
  logs
  backups
  storage
  .vercel
  coverage
  dist
)

echo "RayoBoss - limpieza del espacio de trabajo"
echo "Se conservarán .git y .env. La contraseña local no se elimina automáticamente."
for target in "${TARGETS[@]}"; do
  [[ -e "$target" ]] && echo "  eliminar: $target"
done
find . -type f \( -name '*.log' -o -name '*.pid' -o -name '*.tmp' -o -name '*.swp' \) -not -path './.git/*' -print | sed 's/^/  eliminar: /'

if [[ "$MODE" != "--apply" ]]; then
  echo
  echo "Vista previa solamente. Para ejecutar: bash scripts/clean-workspace.sh --apply"
  exit 0
fi

for target in "${TARGETS[@]}"; do rm -rf -- "$target"; done
find . -type f \( -name '*.log' -o -name '*.pid' -o -name '*.tmp' -o -name '*.swp' \) -not -path './.git/*' -delete

echo "Limpieza terminada. Verifica con: git status --short"
