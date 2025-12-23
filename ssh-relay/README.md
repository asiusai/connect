# SSH Relay Server

SSH relay server for new-connect, similar to `ssh.comma.ai`.

## Architecture

```
User SSH → Hetzner VPS (ssh2 + WebSocket) ← Device WebSocket
```

1. User runs `ssh comma-{dongleid}@ssh.new-connect.dev`
2. Relay accepts SSH, extracts dongle ID from username
3. Relay calls Athena to tell device to connect via WebSocket
4. Device connects to `wss://ssh.new-connect.dev:8080/{sessionId}`
5. Relay bridges SSH stream ↔ WebSocket
6. Device's SSH daemon handles actual authentication

## Local Development

```bash
# Generate a test host key
ssh-keygen -t ed25519 -f ssh-relay/host_key -N ""

# Run locally (requires root for port 22, or use SSH_PORT=2222)
SSH_PORT=2222 WS_PORT=8080 HOST_KEY=ssh-relay/host_key bun ssh:dev
```

## Server Setup (Hetzner)

### 1. Create VPS

- Hetzner CX11 (~€3/mo) or CX22 (~€4/mo)
- Ubuntu 24.04
- Add your SSH key

### 2. Initial Setup

```bash
# SSH into the server
ssh root@YOUR_SERVER_IP

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Create directory
mkdir -p /opt/ssh-relay

# Generate host key
ssh-keygen -t ed25519 -f /opt/ssh-relay/host_key -N ""

# Create systemd service
cat > /etc/systemd/system/ssh-relay.service << 'EOF'
[Unit]
Description=SSH Relay
After=network.target

[Service]
WorkingDirectory=/opt/ssh-relay
Environment=HOST_KEY=/opt/ssh-relay/host_key
Environment=WS_HOST=ssh.new-connect.dev
ExecStart=/root/.bun/bin/bun run index.ts
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl enable ssh-relay
```

### 3. Deploy

From your local machine:

```bash
cd ssh-relay
./deploy.sh
```

Or manually:

```bash
rsync -avz --exclude node_modules --exclude host_key \
  ssh-relay/ root@ssh.new-connect.dev:/opt/ssh-relay/

ssh root@ssh.new-connect.dev "cd /opt/ssh-relay && bun install && systemctl restart ssh-relay"
```

### 4. DNS

Point `ssh.new-connect.dev` A record to your Hetzner VPS IP.

## User SSH Config

Add to `~/.ssh/config`:

```
Host comma-*
  Port 22
  User comma
  ProxyCommand ssh %h@ssh.new-connect.dev -W %h:%p

Host ssh.new-connect.dev
  Hostname ssh.new-connect.dev
  Port 22
```

Then connect with:

```bash
ssh comma-{dongleid}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST_KEY` | `./host_key` | Path to SSH host key |
| `ATHENA_URL` | `https://athena.new-connect.dev` | Athena API endpoint |
| `WS_PORT` | `8080` | WebSocket port for device connections |
| `SSH_PORT` | `22` | SSH port for user connections |
| `WS_HOST` | `ssh.new-connect.dev` | Hostname for WebSocket URL sent to device |
