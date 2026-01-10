#!/bin/bash
# SSH into the SSH proxy server
# Usage: ./ssh-ssh.sh [command]

cd "$(dirname "$0")"
IP=$(dotenv pulumi stack export 2>/dev/null | jq -r '.deployment.resources[] | select(.type == "hcloud:index/server:Server") | select(.outputs.serverType == "cax11") | .outputs.ipv4Address' 2>/dev/null)

if [[ -z "$IP" ]]; then
  echo "Error: Could not get server IP from Pulumi"
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
