#!/bin/bash
set -e

HOST="${SSH_RELAY_HOST:-root@ssh.new-connect.dev}"
REMOTE_PATH="/opt/ssh-relay"

echo "Deploying to $HOST..."

rsync -avz --exclude node_modules --exclude .git --exclude host_key \
  . "$HOST:$REMOTE_PATH/"

ssh "$HOST" "cd $REMOTE_PATH && bun install && systemctl restart ssh-relay"

echo "Deployed successfully!"
