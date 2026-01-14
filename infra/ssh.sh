#!/bin/bash
# SSH into any Hetzner server
# Usage: ./ssh.sh <server> [command]
# Examples:
#   ./ssh.sh api          # SSH into API server
#   ./ssh.sh ssh          # SSH into SSH server
#   ./ssh.sh build        # SSH into build server
#   ./ssh.sh api "ls -la" # Run command on API server

cd "$(dirname "$0")"

if [[ -z "$1" ]]; then
  echo "Usage: ./ssh.sh <server> [command]"
  echo "Available servers: api, ssh, build"
  exit 1
fi

SERVER="$1"
shift

IP=$(dotenv pulumi stack output "${SERVER}" --json 2>/dev/null | jq -r '.ipv4')

if [[ -z "$IP" || "$IP" == "null" ]]; then
  echo "Error: Could not get ${SERVER}.ipv4 from Pulumi. Is '$SERVER' a valid server?"
  echo "Available servers: api, ssh, build"
  exit 1
fi

KEY_FILE=$(mktemp)
dotenv pulumi config get sshPrivateKey > "$KEY_FILE" 2>/dev/null
chmod 600 "$KEY_FILE"

if [[ -n "$1" ]]; then
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$KEY_FILE" "root@$IP" "$@" 2>/dev/null
else
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$KEY_FILE" "root@$IP" 2>/dev/null
fi

rm -f "$KEY_FILE"
