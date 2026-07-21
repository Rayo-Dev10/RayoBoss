#!/usr/bin/env bash
set -euo pipefail
PORT_VALUE="${PORT:-3000}"
if curl --fail --silent --show-error "http://127.0.0.1:${PORT_VALUE}/api/health"; then echo; else echo "RayoBoss no responde en el puerto ${PORT_VALUE}."; exit 1; fi
