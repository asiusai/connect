#!/bin/bash
# SSH into the API server
# Usage: ./ssh.sh [command]
# Examples:
#   ./ssh.sh              # Interactive shell
#   ./ssh.sh "ls -la"     # Run command

# Get server IP and SSH key from Pulumi
cd "$(dirname "$0")"
IP=$(dotenv pulumi stack export 2>/dev/null | grep -oE '"ipv4Address": "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"' | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+')

if [[ -z "$IP" ]]; then
  echo "Error: Could not get server IP from Pulumi"
  exit 1
fi

# Create temp file for SSH key
KEY_FILE=$(mktemp)
dotenv pulumi config get sshPrivateKey > "$KEY_FILE" 2>/dev/null
chmod 600 "$KEY_FILE"

# SSH into server
if [[ -n "$1" ]]; then
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$KEY_FILE" "root@$IP" "$@" 2>/dev/null
else
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$KEY_FILE" "root@$IP" 2>/dev/null
fi

# Cleanup
rm -f "$KEY_FILE"
