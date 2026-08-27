#!/usr/bin/env bash
# After a Mac restart, run:  bash scripts/start-mac.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec bash "$ROOT/scripts/setup-local.sh"
