#!/bin/bash
set -e

export PATH="/root/.bun/bin:$PATH"

# Start Caddy in background
caddy start --config /app/ssh/Caddyfile &

# Start the SSH/WS server
exec bun run index.ts
