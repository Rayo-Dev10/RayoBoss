#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
touch logs/rayoboss.log
tail -n 100 -f logs/rayoboss.log
