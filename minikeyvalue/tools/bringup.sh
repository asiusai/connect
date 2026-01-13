#!/bin/bash
#trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT
pkill -f nginx 2>/dev/null || true

PORT=3001 ./volume /tmp/volume1/ &
PORT=3002 ./volume /tmp/volume2/ &
PORT=3003 ./volume /tmp/volume3/ &
PORT=3004 ./volume /tmp/volume4/ &
PORT=3005 ./volume /tmp/volume5/ &
mkdir -p /tmp/mkvdb
./mkv -port 3000 -volumes localhost:3001,localhost:3002,localhost:3003,localhost:3004,localhost:3005 -replicas 1 -db /tmp/mkvdb/ server -voltimeout 30s -v