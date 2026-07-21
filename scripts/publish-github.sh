#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE_URL="${1:-}"
if [[ -z "$REMOTE_URL" ]]; then
  echo "Uso: bash scripts/publish-github.sh https://github.com/USUARIO/REPOSITORIO.git"
  exit 1
fi

npm run verify
if [[ ! -d .git ]]; then git init; fi
git branch -M main
git add -A
node scripts/check-git-index.js

if ! git config user.name >/dev/null || ! git config user.email >/dev/null; then
  echo "Configura primero tu identidad Git:"
  echo '  git config --global user.name "Tu nombre"'
  echo '  git config --global user.email "tu-correo@example.com"'
  exit 1
fi

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  if ! git diff --cached --quiet; then git commit -m "release: RayoBoss 4.0.1"; fi
else
  git commit -m "release: RayoBoss 4.0.1"
fi

if git remote get-url origin >/dev/null 2>&1; then git remote set-url origin "$REMOTE_URL"; else git remote add origin "$REMOTE_URL"; fi
git push -u origin main
echo "Repositorio publicado. Ya puedes importarlo en Vercel."
