#!/bin/bash

# Shopify Clone - Start Script
# Refuses to overwrite another process and starts only this checkout.

set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ "${NODE_ENV:-}" == test && -n "${RUNTIME_PROJECT_SOURCE:-}" ]]; then
    project_dir="$RUNTIME_PROJECT_SOURCE"
fi
cd "$project_dir"

PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"

if lsof -tiTCP:"$PORT" -sTCP:LISTEN > /dev/null 2>&1; then
    echo "Port $PORT is already in use; refusing to terminate an unrelated process."
    exit 1
fi

exec npm run dev -- --hostname "$HOST" --port "$PORT"
