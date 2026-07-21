#!/usr/bin/env bash
set -euo pipefail
bash "$(dirname "$0")/stop.sh"
bash "$(dirname "$0")/start.sh"
