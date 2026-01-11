import * as cloudflare from '@pulumi/cloudflare'
import { Site } from './Site'
import { Worker } from './Worker'

// ------------------------- CONSTS -------------------------
const accountId = '558df022e422781a34f239d7de72c8ae'
const zoneId = 'f4c49c38916764f43e3854fb5461db31'

// ------------------------- BUCKETS -------------------------
const dbBackupBucket = new cloudflare.R2Bucket('db-backup-bucket', {
  accountId,
  name: 'asius-db-backup',
})

// ------------------------- PROXIES -------------------------
new Worker('api-konik-proxy', {
  accountId,
  zoneId,
  domain: 'api-konik-proxy.asius.ai',
  file: './workers/cors-proxy.js',
  env: { ORIGIN: 'api.konik.ai' },
})
new Worker('athena-comma-proxy', {
  accountId,
  zoneId,
  domain: 'athena-comma-proxy.asius.ai',
  file: './workers/cors-proxy.js',
  env: { ORIGIN: 'athena.comma.ai' },
})
new Worker('billing-comma-proxy', {
  accountId,
  zoneId,
  domain: 'billing-comma-proxy.asius.ai',
  file: './workers/cors-proxy.js',
  env: { ORIGIN: 'billing.comma.ai' },
})

// ------------------------- INSTALLERS -------------------------
new Worker('openpilot-installer', {
  accountId,
  zoneId,
  domain: 'openpilot.asius.ai',
  file: './workers/installer.js',
})
new Worker('sunnypilot-installer', {
  accountId,
  zoneId,
  domain: 'sunnypilot.asius.ai',
  file: './workers/installer.js',
})

// ------------------------- SITES -------------------------
new Site('comma-connect', {
  accountId,
  zoneId,
  rootDir: 'connect',
  buildCommand: 'bun i && bun run --bun vite build --mode comma',
  domain: 'comma.asius.ai',
})
new Site('konik-connect', {
  accountId,
  zoneId,
  rootDir: 'connect',
  buildCommand: 'bun i && bun run --bun vite build --mode konik',
  domain: 'konik.asius.ai',
})
new Site('asius-connect', {
  accountId,
  zoneId,
  rootDir: 'connect',
  buildCommand: 'bun i && bun run --bun vite build --mode asius',
  domain: 'connect.asius.ai',
})
new Site('asius-site', {
  accountId,
  zoneId,
  rootDir: 'site',
  buildCommand: 'bun i && bun run build',
  domain: 'asius.ai',
})

// // ------------------------- API SERVER -------------------------
// const sshKey = new hcloud.SshKey('api-ssh-key', {
//   publicKey: config.requireSecret('sshPublicKey'),
// })

// const firewall = new hcloud.Firewall('api-firewall', {
//   rules: [
//     { direction: 'in', protocol: 'tcp', port: '22', sourceIps: ['0.0.0.0/0', '::/0'] },
//     { direction: 'in', protocol: 'tcp', port: '80', sourceIps: ['0.0.0.0/0', '::/0'] },
//   ],
// })

// const apiServer = new hcloud.Server('api-server', {
//   serverType: 'cpx22',
//   image: 'ubuntu-24.04',
//   location: 'nbg1',
//   sshKeys: [sshKey.id],
//   firewallIds: [firewall.id.apply((id) => parseInt(id, 10))],
// })

// new cloudflare.DnsRecord('api-dns', {
//   zoneId: ASIUS_ZONE_ID,
//   name: 'api',
//   type: 'A',
//   content: apiServer.ipv4Address,
//   proxied: true,
//   ttl: 1,
// })

// const sshPrivateKey = config.requireSecret('sshPrivateKey')

// // One-time server setup (installs bun, go, clones repo, creates systemd service)
// const serverSetup = new command.remote.Command(
//   'server-setup',
//   {
//     connection: {
//       host: apiServer.ipv4Address,
//       user: 'root',
//       privateKey: sshPrivateKey,
//     },
//     create: pulumi.interpolate`set -e

// # Install dependencies
// apt-get update && apt-get install -y sshfs golang-go curl git unzip

// # Install bun
// curl -fsSL https://bun.sh/install | bash
// export PATH="/root/.bun/bin:$PATH"

// # Create data directories
// mkdir -p /data/mkv1 /data/mkv2 /data/mkvdb /data/db

// # Setup SSH key for storage boxes
// mkdir -p /root/.ssh
// echo '${sshPrivateKey}' > /root/.ssh/storagebox_key
// chmod 600 /root/.ssh/storagebox_key

// # Add storage box hosts to known_hosts
// ssh-keyscan -p 23 u526268.your-storagebox.de >> /root/.ssh/known_hosts 2>/dev/null || true
// ssh-keyscan -p 23 u526270.your-storagebox.de >> /root/.ssh/known_hosts 2>/dev/null || true

// # Create systemd service for SSHFS mounts
// cat > /etc/systemd/system/sshfs-mounts.service << 'SSHFS_EOF'
// [Unit]
// Description=Mount storage boxes via SSHFS
// After=network-online.target
// Wants=network-online.target

// [Service]
// Type=oneshot
// RemainAfterExit=yes
// ExecStartPre=/bin/bash -c 'fusermount -u /data/mkv1 2>/dev/null || true'
// ExecStartPre=/bin/bash -c 'fusermount -u /data/mkv2 2>/dev/null || true'
// ExecStart=/usr/bin/sshfs -o IdentityFile=/root/.ssh/storagebox_key,port=23,allow_other,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 u526268@u526268.your-storagebox.de: /data/mkv1
// ExecStart=/usr/bin/sshfs -o IdentityFile=/root/.ssh/storagebox_key,port=23,allow_other,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 u526270@u526270.your-storagebox.de: /data/mkv2
// ExecStop=/bin/fusermount -u /data/mkv1
// ExecStop=/bin/fusermount -u /data/mkv2

// [Install]
// WantedBy=multi-user.target
// SSHFS_EOF

// systemctl daemon-reload
// systemctl enable sshfs-mounts
// systemctl start sshfs-mounts

// # Create required subdirs on storage boxes
// mkdir -p /data/mkv1/tmp /data/mkv1/body_temp
// mkdir -p /data/mkv2/tmp /data/mkv2/body_temp

// # Clone repo if not exists
// if [ ! -d /app ]; then
//   git clone https://github.com/asiusai/asiusai.git /app
// fi

// # Build MKV binary
// cd /app/minikeyvalue/src && go build -o mkv

// # Fix nginx volume script to log to file instead of /dev/stderr (doesn't work under systemd)
// sed -i 's|error_log /dev/stderr|error_log /tmp/nginx_error.log|g' /app/minikeyvalue/volume

// # Install nginx for MKV volume servers
// apt-get install -y nginx
// systemctl stop nginx
// systemctl disable nginx

// # Create systemd service for API
// cat > /etc/systemd/system/asius-api.service << 'EOF'
// [Unit]
// Description=Asius API
// After=network.target sshfs-mounts.service
// Requires=sshfs-mounts.service

// [Service]
// Type=simple
// WorkingDirectory=/app
// ExecStart=/app/start-api.sh
// Restart=always
// Environment=PORT=80
// Environment=MKV_DB=/data/mkvdb
// Environment=MKV_DATA1=/data/mkv1
// Environment=MKV_DATA2=/data/mkv2
// Environment=DB_PATH=/data/db/data.db
// Environment=JWT_SECRET=${config.requireSecret('jwtSecret')}
// Environment=GOOGLE_CLIENT_ID=${config.requireSecret('googleClientId')}
// Environment=GOOGLE_CLIENT_SECRET=${config.requireSecret('googleClientSecret')}
// Environment=API_ORIGIN=wss://api.asius.ai
// Environment=SSH_API_KEY=${config.requireSecret('sshApiKey')}
// Environment=R2_BUCKET=${dbBackupBucket.name}
// Environment=R2_ACCOUNT_ID=${ACCOUNT_ID}
// Environment=R2_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}
// Environment=R2_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY}

// [Install]
// WantedBy=multi-user.target
// EOF

// systemctl daemon-reload
// systemctl enable asius-api

// # Stop old docker services if any
// systemctl stop api 2>/dev/null || true
// systemctl disable api 2>/dev/null || true
// docker stop asius-api 2>/dev/null || true
// docker rm asius-api 2>/dev/null || true
// `,
//     triggers: [apiServer.id],
//   },
//   { dependsOn: [apiServer] },
// )

// // Push current commit to deploy branch
// const pushApi = new command.local.Command('push-api-branch', {
//   create: 'git push origin HEAD:refs/heads/deploy-api --force',
//   dir: join(__dirname, '..'),
//   triggers: [Date.now()],
// })

// // Deploy API to server
// const deployApi = new command.remote.Command(
//   'deploy-api',
//   {
//     connection: {
//       host: apiServer.ipv4Address,
//       user: 'root',
//       privateKey: sshPrivateKey,
//     },
//     create: `set -e
// export PATH="/root/.bun/bin:$PATH"

// cd /app

// # Fetch and checkout the deployed commit
// git fetch origin deploy-api
// git checkout FETCH_HEAD --force

// # Install dependencies
// bun install

// # Rebuild MKV if source changed
// cd minikeyvalue/src && go build -o mkv
// cd /app

// # Restart service
// systemctl restart asius-api

// # Wait for health
// for i in $(seq 1 30); do
//   if curl -sf http://localhost/health > /dev/null; then
//     echo "API healthy"
//     exit 0
//   fi
//   sleep 1
// done
// echo "Health check failed"
// exit 1
// `,
//     triggers: [pushApi.stdout],
//   },
//   { dependsOn: [pushApi, serverSetup] },
// )

// export const apiDeployOutput = deployApi.stdout

// // ------------------------- SSH PROXY SERVER -------------------------
// const sshFirewall = new hcloud.Firewall('ssh-firewall', {
//   rules: [
//     { direction: 'in', protocol: 'tcp', port: '22', sourceIps: ['0.0.0.0/0', '::/0'] },
//     { direction: 'in', protocol: 'tcp', port: '2222', sourceIps: ['0.0.0.0/0', '::/0'] }, // SSH proxy
//     { direction: 'in', protocol: 'tcp', port: '80', sourceIps: ['0.0.0.0/0', '::/0'] }, // HTTP (for ACME)
//     { direction: 'in', protocol: 'tcp', port: '443', sourceIps: ['0.0.0.0/0', '::/0'] }, // HTTPS WebSocket
//   ],
// })

// const sshProxyServer = new hcloud.Server('ssh-server', {
//   serverType: 'cax11',
//   image: 'ubuntu-24.04',
//   location: 'fsn1',
//   sshKeys: [sshKey.id],
//   firewallIds: [sshFirewall.id.apply((id) => parseInt(id, 10))],
// })

// // SSH proxy - direct to IP (not proxied, SSH needs direct connection)
// new cloudflare.DnsRecord('ssh-dns', {
//   zoneId: ASIUS_ZONE_ID,
//   name: 'ssh',
//   type: 'A',
//   content: sshProxyServer.ipv4Address,
//   proxied: false,
//   ttl: 1,
// })

// // Temporary alias while rate-limited on ssh.asius.ai
// new cloudflare.DnsRecord('ssh2-dns', {
//   zoneId: ASIUS_ZONE_ID,
//   name: 'ssh2',
//   type: 'A',
//   content: sshProxyServer.ipv4Address,
//   proxied: false,
//   ttl: 1,
// })

// // One-time SSH server setup
// const sshServerSetup = new command.remote.Command(
//   'ssh-server-setup',
//   {
//     connection: {
//       host: sshProxyServer.ipv4Address,
//       user: 'root',
//       privateKey: sshPrivateKey,
//     },
//     create: pulumi.interpolate`set -e

// # Install dependencies
// apt-get update && apt-get install -y curl git unzip

// # Install bun
// curl -fsSL https://bun.sh/install | bash
// export PATH="/root/.bun/bin:$PATH"

// # Install Caddy
// apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
// curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
// curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
// apt-get update && apt-get install -y caddy

// # Clone repo if not exists
// if [ ! -d /app ]; then
//   git clone https://github.com/asiusai/asiusai.git /app
// fi

// # Create systemd service for SSH proxy
// cat > /etc/systemd/system/asius-ssh.service << 'EOF'
// [Unit]
// Description=Asius SSH Proxy
// After=network.target

// [Service]
// Type=simple
// WorkingDirectory=/app/ssh
// ExecStart=/app/ssh/start.sh
// Restart=always
// Environment=SSH_PORT=2222
// Environment=WS_PORT=8080
// Environment=API_KEY=${config.requireSecret('sshApiKey')}
// Environment=WS_ORIGIN=wss://ssh2.asius.ai

// [Install]
// WantedBy=multi-user.target
// EOF

// systemctl daemon-reload
// systemctl enable asius-ssh

// # Stop old docker services if any
// docker stop asius-ssh 2>/dev/null || true
// docker rm asius-ssh 2>/dev/null || true
// `,
//     triggers: [sshProxyServer.id],
//   },
//   { dependsOn: [sshProxyServer] },
// )

// // Push current commit to deploy branch for SSH
// const pushSsh = new command.local.Command('push-ssh-branch', {
//   create: 'git push origin HEAD:refs/heads/deploy-ssh --force',
//   dir: join(__dirname, '..'),
//   triggers: [Date.now()],
// })

// // Deploy SSH proxy to server
// const deploySsh = new command.remote.Command(
//   'deploy-ssh',
//   {
//     connection: {
//       host: sshProxyServer.ipv4Address,
//       user: 'root',
//       privateKey: sshPrivateKey,
//     },
//     create: `set -e
// export PATH="/root/.bun/bin:$PATH"

// cd /app

// # Fetch and checkout the deployed commit
// git fetch origin deploy-ssh
// git checkout FETCH_HEAD --force

// # Install dependencies
// cd ssh && bun install
// cd /app

// # Restart service
// systemctl restart asius-ssh

// # Wait for health
// sleep 3
// curl -sf https://ssh2.asius.ai/health || echo "Health check via HTTPS not ready yet (may need Caddy to get cert)"
// echo "SSH proxy deployed"
// `,
//     triggers: [pushSsh.stdout],
//   },
//   { dependsOn: [pushSsh, sshServerSetup] },
// )

// export const sshDeployOutput = deploySsh.stdout
