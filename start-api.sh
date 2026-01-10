#!/bin/bash
set -e

echo "Starting asius-api..."

export PATH="/root/.bun/bin:$PATH"

# Defaults
MKV_PORT=${MKV_PORT:-3000}
MKV_DB=${MKV_DB:-/data/mkvdb}
MKV_DATA1=${MKV_DATA1:-/data/mkv1}
MKV_DATA2=${MKV_DATA2:-/data/mkv2}

# Setup MKV volumes - use local temp dirs for nginx (avoids SSHFS permission issues)
mkdir -p /tmp/mkv1_tmp /tmp/mkv1_body /tmp/mkv2_tmp /tmp/mkv2_body

echo "Starting volume server on port 3001 for $MKV_DATA1"
PORT=3001 MKV_TMP=/tmp/mkv1_tmp MKV_BODY=/tmp/mkv1_body ./minikeyvalue/volume "$MKV_DATA1/" &

echo "Starting volume server on port 3002 for $MKV_DATA2"
PORT=3002 MKV_TMP=/tmp/mkv2_tmp MKV_BODY=/tmp/mkv2_body ./minikeyvalue/volume "$MKV_DATA2/" &

echo "Starting MKV master on port $MKV_PORT"
./minikeyvalue/src/mkv \
  -volumes "localhost:3001,localhost:3002" \
  -db "$MKV_DB" \
  -replicas 1 \
  --port "$MKV_PORT" \
  server &

# Wait for MKV to be ready (active polling instead of sleep)
echo "Waiting for MKV..."
until curl -s -o /dev/null -w "%{http_code}" "http://localhost:${MKV_PORT}/" 2>/dev/null | grep -q "404"; do
  sleep 0.2
done
echo "MKV ready"

export MKV_URL="http://localhost:${MKV_PORT}"

# Run database migrations
cd api
echo "Running database migrations..."
bun run db:push

echo "Starting API on port $PORT..."
exec bun run index.ts
