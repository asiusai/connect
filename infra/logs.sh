#!/bin/bash
# Fetch logs from the API server
# Usage: ./logs.sh [lines] [follow]
# Examples:
#   ./logs.sh          # Last 50 lines
#   ./logs.sh 100      # Last 100 lines
#   ./logs.sh -f       # Follow logs

LINES=${1:-50}
FOLLOW=""

if [[ "$1" == "-f" ]] || [[ "$2" == "-f" ]]; then
  FOLLOW="-f"
  [[ "$1" == "-f" ]] && LINES=50
fi

DIR="$(dirname "$0")"
"$DIR/ssh.sh" "docker logs asius-api --tail $LINES $FOLLOW"
