import * as cloudflare from '@pulumi/cloudflare'
import * as hcloud from '@pulumi/hcloud'
import * as pulumi from '@pulumi/pulumi'
import { Site } from './Site'
import { Worker } from './Worker'
import { Server } from './Server'

const config = new pulumi.Config()

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

// ------------------------- SERVERS -------------------------
const sshPublicKey = config.requireSecret('sshPublicKey')
const sshPrivateKey = config.requireSecret('sshPrivateKey')

const sshKey = new hcloud.SshKey('hetzner-ssh-key', { publicKey: sshPublicKey })

// ------------------------- API SERVER -------------------------
const R2_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!

const apiServer = new Server('api', {
  allowedPorts: ['22', '80'],
  sshKeyId: sshKey.id,
  zoneId,
  serverType: 'cpx32',
  domain: 'api.asius.ai',
  sshPrivateKey,
  proxied: true,
  services: [
    ...[
      { i: 1, user: 'u526268' },
      { i: 2, user: 'u526270' },
    ].map(({ i, user }) => ({
      name: `asius-mkv${i}`,
      check: `until nc -z localhost 300${i}; do sleep 0.5; done`,
      service: {
        Unit: {
          Description: `MiniKeyValue Volume ${i}`,
          After: 'network.target',
        },
        Service: {
          Type: 'simple',
          WorkingDirectory: '/app',
          Environment: {
            PORT: `300${i}`,
            MKV_TMP: `/tmp/mkv${i}_tmp`,
            MKV_BODY: `/tmp/mkv${i}_body`,
          },
          ExecStartPre: [
            `/bin/bash -c 'fusermount -u /data/mkv${i} 2>/dev/null || true'`,
            `/bin/bash -c 'ssh-keyscan -p 23 ${user}.your-storagebox.de >> /root/.ssh/known_hosts 2>/dev/null || true'`,
            `/usr/bin/sshfs -o IdentityFile=/root/.ssh/storagebox_key,port=23,allow_other,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 ${user}@${user}.your-storagebox.de: /data/mkv${i}`,
            `/bin/mkdir -p /tmp/mkv${i}_tmp /tmp/mkv${i}_body`,
          ],
          ExecStart: `/app/minikeyvalue/volume /data/mkv${i}/`,
          ExecStopPost: `/bin/fusermount -u /data/mkv${i}`,
          Restart: 'always',
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
    })),
    {
      name: 'asius-mkv',
      check: 'until nc -z localhost 3000; do sleep 0.5; done',
      service: {
        Unit: {
          Description: 'MiniKeyValue Master',
          After: 'asius-mkv1.service asius-mkv2.service',
          Requires: 'asius-mkv1.service asius-mkv2.service',
        },
        Service: {
          Type: 'simple',
          WorkingDirectory: '/app',
          ExecStartPre: "/bin/bash -c 'until curl -sf http://localhost:3001/ && curl -sf http://localhost:3002/; do sleep 0.5; done'",
          ExecStart: '/app/minikeyvalue/src/mkv -volumes localhost:3001,localhost:3002 -db /data/mkv1/mkvdb -replicas 1 --port 3000 server',
          Restart: 'always',
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
    },
    {
      name: 'asius-api',
      check: 'until curl -sf http://localhost:80/health; do sleep 0.5; done',
      service: {
        Unit: {
          Description: 'Asius API',
          After: 'network.target asius-mkv.service',
          Requires: 'asius-mkv.service',
        },
        Service: {
          Type: 'simple',
          WorkingDirectory: '/app/api',
          ExecStartPre: "/bin/bash -c 'until nc -z localhost 3000; do sleep 0.5; done'",
          ExecStart: 'bun run index.ts',
          Restart: 'always',
          Environment: {
            PORT: '80',
            MKV_URL: 'http://localhost:3000',
            DB_PATH: '/data/db/data.db',
            JWT_SECRET: config.requireSecret('jwtSecret'),
            GOOGLE_CLIENT_ID: config.requireSecret('googleClientId'),
            GOOGLE_CLIENT_SECRET: config.requireSecret('googleClientSecret'),
            GITHUB_CLIENT_ID: config.requireSecret('githubClientId'),
            GITHUB_CLIENT_SECRET: config.requireSecret('githubClientSecret'),
            API_ORIGIN: 'wss://api.asius.ai',
            SSH_API_KEY: config.requireSecret('sshApiKey'),
            GITHUB_TOKEN: config.requireSecret('ghToken'),
            R2_BUCKET: dbBackupBucket.name,
            R2_ACCOUNT_ID: accountId,
            R2_ACCESS_KEY_ID,
            R2_SECRET_ACCESS_KEY,
          },
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
    },
  ],
  createScript: pulumi.interpolate`
set -e
apt-get update && apt-get install -y sshfs golang-go curl git unzip nginx ffmpeg

# Install bun
curl -fsSL https://bun.sh/install | bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun

# Create data directories
mkdir -p /data/mkv1 /data/mkv2 /data/db /app

# Setup SSH key for storage boxes
mkdir -p /root/.ssh
echo '${sshPrivateKey}' > /root/.ssh/storagebox_key
chmod 600 /root/.ssh/storagebox_key

# Disable nginx (only used by MKV volume)
systemctl stop nginx
systemctl disable nginx
`,
  deployScript: `cd /app/minikeyvalue/src && go build -o mkv && cd /app/api && bun install`,
})

// ------------------------- SSH SERVER -------------------------
const sshServer = new Server('ssh', {
  allowedPorts: ['22', '2222', '80', '443'],
  serverType: 'cpx22',
  sshPrivateKey,
  sshKeyId: sshKey.id,
  zoneId,
  domain: 'ssh.asius.ai',
  proxied: false,
  services: [
    {
      name: 'asius-caddy',
      check: 'until curl -sf http://localhost:80/health; do sleep 0.5; done',
      service: {
        Unit: {
          Description: 'Caddy web server for SSH proxy',
          After: 'network.target',
        },
        Service: {
          Type: 'simple',
          ExecStart: '/usr/bin/caddy run --config /app/ssh/Caddyfile',
          ExecReload: '/usr/bin/caddy reload --config /app/ssh/Caddyfile',
          Restart: 'always',
          Environment: {
            XDG_DATA_HOME: '/data/caddy',
            XDG_CONFIG_HOME: '/data/caddy',
          },
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
    },
    {
      name: 'asius-ssh',
      check: 'until nc -z localhost 2222; do sleep 0.5; done',
      service: {
        Unit: {
          Description: 'Asius SSH Proxy',
          After: 'network.target asius-caddy.service',
        },
        Service: {
          Type: 'simple',
          WorkingDirectory: '/app/ssh',
          ExecStart: 'bun run index.ts',
          Restart: 'always',
          Environment: {
            SSH_PORT: '2222',
            WS_PORT: '8080',
            API_KEY: config.requireSecret('sshApiKey'),
            WS_ORIGIN: 'wss://ssh.asius.ai',
          },
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
    },
  ],
  createScript: pulumi.interpolate`set -e
# Install dependencies
apt-get update && apt-get install -y curl git unzip

# Install bun
curl -fsSL https://bun.sh/install | bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun

# Install Caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# Create Caddy data directory for TLS certs
mkdir -p /data/caddy

# Stop default Caddy service (we use our own)
systemctl stop caddy || true
systemctl disable caddy || true
`,
  deployScript: `cd /app/ssh && bun install`,
})

// ------------------------- EXPORTS -------------------------
export const apiIp = apiServer.ipAddress
export const sshIp = sshServer.ipAddress
