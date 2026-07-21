#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
if [[ -e .env ]]; then
  echo "Ya existe .env. No se sobrescribió."
  exit 1
fi
command -v node >/dev/null || { echo "Node.js es obligatorio."; exit 1; }
DEV_PASSWORD="$(node -e "process.stdout.write(require('crypto').randomBytes(18).toString('base64url'))")"
SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")"
cat > .env <<ENV
RAYOBOSS_DEV_PASSWORD=${DEV_PASSWORD}
RAYOBOSS_SECRET=${SECRET}
RAYOBOSS_STORAGE_PROVIDER=auto
RAYOBOSS_SESSION_HOURS=12
RAYOBOSS_MIN_PASSWORD=12
RAYOBOSS_SCRYPT_N=131072
RAYOBOSS_SCRYPT_R=8
RAYOBOSS_SCRYPT_P=1
RAYOBOSS_SCRYPT_MAXMEM_MB=256
RAYOBOSS_FRAME_MS=200
RAYOBOSS_SAMPLE_RATE=22050
RAYOBOSS_GAIN=0.7
RAYOBOSS_LIVE_SECONDS=90
RAYOBOSS_RTC_POLL_MS=900
RAYOBOSS_RTC_ROOM_TTL=900
RAYOBOSS_RTC_CLIENT_TTL=180
RAYOBOSS_RTC_MAX_PARTICIPANTS=8
RAYOBOSS_RTC_MAX_LISTENERS=40
PORT=3000
RAYOBOSS_COOKIE_SECURE=auto
ENV
chmod 600 .env 2>/dev/null || true
printf '%s\n' "Archivo .env creado." \
  "Usuario inicial: dev" \
  "Contraseña inicial (guardar ahora): ${DEV_PASSWORD}" \
  "La contraseña no volverá a mostrarse automáticamente."
