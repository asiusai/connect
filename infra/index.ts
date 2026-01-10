import * as cloudflare from '@pulumi/cloudflare'
import * as command from '@pulumi/command'
import * as hcloud from '@pulumi/hcloud'
import * as pulumi from '@pulumi/pulumi'
import { readFileSync } from 'fs'
import { join } from 'path'

const config = new pulumi.Config()

// ------------------------- CONSTS -------------------------
const ACCOUNT_ID = '558df022e422781a34f239d7de72c8ae'
const ASIUS_ZONE_ID = 'f4c49c38916764f43e3854fb5461db31'

// R2 bucket for SQLite backups (uses same credentials as Pulumi state)
const dbBackupBucket = new cloudflare.R2Bucket('db-backup-bucket', {
  accountId: ACCOUNT_ID,
  name: 'asius-db-backup',
})
const NEW_CONNECT_ZONE_ID = '9dbe2445beeb3c44e991656fada0231c'

// ------------------------- PROXIES -------------------------
const deployProxy = (original: string, subdomain: string) => {
  const worker = new cloudflare.WorkersScript(subdomain, {
    accountId: ACCOUNT_ID,
    scriptName: subdomain,
    mainModule: 'index.js',
    content: `
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Authorization',
  'Access-Control-Max-Age': '86400',
}

export default {
  fetch: async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })

    const url = new URL(request.url)

    const response = await fetch(new Request('https://${original}' + url.pathname + url.search, request))

    const newResponse = new Response(response.body, response)
    for (const key in HEADERS) newResponse.headers.set(key, HEADERS[key])

    return newResponse
  },
}`,
  })

  new cloudflare.DnsRecord(`${subdomain}-dns`, {
    zoneId: ASIUS_ZONE_ID,
    name: subdomain,
    type: 'AAAA',
    content: '100::',
    proxied: true,
    ttl: 1,
  })

  new cloudflare.WorkersRoute(`${subdomain}-route`, {
    zoneId: ASIUS_ZONE_ID,
    pattern: `${subdomain}.asius.ai/*`,
    script: worker.scriptName,
  })
}

deployProxy('api.konik.ai', 'api-konik-proxy')
deployProxy('athena.comma.ai', 'athena-comma-proxy')
deployProxy('billing.comma.ai', 'billing-comma-proxy')

// ------------------------- CONNECT APPS -------------------------
const deployConnect = (name: string, mode: string, subdomain: string) => {
  const project = new cloudflare.PagesProject(`${name}-connect`, {
    accountId: ACCOUNT_ID,
    name: `${name}-connect`,
    productionBranch: 'master',
    buildConfig: {
      buildCommand: `bun i && bun run --bun vite build --mode ${mode}`,
      destinationDir: 'dist',
    },
    source: {
      type: 'github',
      config: { owner: 'asiusai', repoName: 'connect', prCommentsEnabled: true },
    },
  })

  new cloudflare.PagesDomain(`${name}-connect-domain`, {
    accountId: ACCOUNT_ID,
    projectName: project.name,
    name: `${subdomain}.asius.ai`,
  })

  new cloudflare.DnsRecord(`${name}-connect-dns`, {
    zoneId: ASIUS_ZONE_ID,
    name: subdomain,
    type: 'CNAME',
    content: `${name}-connect.pages.dev`,
    proxied: true,
    ttl: 1,
  })

  return project
}

const comma = deployConnect('comma', 'comma', 'comma')
deployConnect('konik', 'konik', 'konik')
deployConnect('asius', 'asius', 'connect')

// Extra domains for comma connect
new cloudflare.PagesDomain('new-connect-domain', {
  accountId: ACCOUNT_ID,
  projectName: comma.name,
  name: 'new-connect.dev',
})

new cloudflare.DnsRecord('new-connect-dns', {
  zoneId: NEW_CONNECT_ZONE_ID,
  name: '@',
  type: 'CNAME',
  content: 'comma-connect.pages.dev',
  proxied: true,
  ttl: 1,
})

// ------------------------- ASIUS.AI SITE -------------------------
const site = new cloudflare.PagesProject('asius-site', {
  accountId: ACCOUNT_ID,
  name: 'asius-site',
  productionBranch: 'master',
  buildConfig: {
    rootDir: 'site',
    buildCommand: 'bun i && bun run build',
    destinationDir: 'dist',
    buildCaching: true,
  },
  deploymentConfigs: {
    production: {
      envVars: {
        SKIP_DEPENDENCY_INSTALL: { value: 'true', type: 'plain_text' },
      },
    },
    preview: {
      envVars: {
        SKIP_DEPENDENCY_INSTALL: { value: 'true', type: 'plain_text' },
      },
    },
  },
  source: {
    type: 'github',
    config: {
      owner: 'asiusai',
      repoName: 'asiusai',
      prCommentsEnabled: true,
    },
  },
})

new cloudflare.PagesDomain('asius-site-domain', {
  accountId: ACCOUNT_ID,
  projectName: site.name,
  name: 'asius.ai',
})

new cloudflare.DnsRecord('asius-site-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: '@',
  type: 'CNAME',
  content: 'asius-site.pages.dev',
  proxied: true,
  ttl: 1,
})

// ------------------------- OPENPILOT/SUNNYPILOT INSTALLERS -------------------------
const installerWorker = readFileSync(join(__dirname, '../installer/worker.js'), 'utf-8')

const installer = new cloudflare.WorkersScript('installer', {
  accountId: ACCOUNT_ID,
  scriptName: 'installer',
  mainModule: 'index.js',
  content: installerWorker,
})

// openpilot.asius.ai
new cloudflare.DnsRecord('openpilot-installer-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'openpilot',
  type: 'AAAA',
  content: '100::',
  proxied: true,
  ttl: 1,
})

new cloudflare.WorkersRoute('openpilot-installer-route', {
  zoneId: ASIUS_ZONE_ID,
  pattern: 'openpilot.asius.ai/*',
  script: installer.scriptName,
})

// sunnypilot.asius.ai
new cloudflare.DnsRecord('sunnypilot-installer-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'sunnypilot',
  type: 'AAAA',
  content: '100::',
  proxied: true,
  ttl: 1,
})

new cloudflare.WorkersRoute('sunnypilot-installer-route', {
  zoneId: ASIUS_ZONE_ID,
  pattern: 'sunnypilot.asius.ai/*',
  script: installer.scriptName,
})

// ------------------------- API SERVER -------------------------
const sshKey = new hcloud.SshKey('api-ssh-key', {
  publicKey: config.requireSecret('sshPublicKey'),
})

const firewall = new hcloud.Firewall('api-firewall', {
  rules: [
    { direction: 'in', protocol: 'tcp', port: '22', sourceIps: ['0.0.0.0/0', '::/0'] },
    { direction: 'in', protocol: 'tcp', port: '80', sourceIps: ['0.0.0.0/0', '::/0'] },
  ],
})

const apiServer = new hcloud.Server('api-server', {
  serverType: 'cpx22',
  image: 'ubuntu-24.04',
  location: 'nbg1',
  sshKeys: [sshKey.id],
  firewallIds: [firewall.id.apply((id) => parseInt(id, 10))],
})

new cloudflare.DnsRecord('api-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'api',
  type: 'A',
  content: apiServer.ipv4Address,
  proxied: true,
  ttl: 1,
})

const sshPrivateKey = config.requireSecret('sshPrivateKey')

// One-time server setup (installs bun, go, clones repo, creates systemd service)
const serverSetup = new command.remote.Command(
  'server-setup',
  {
    connection: {
      host: apiServer.ipv4Address,
      user: 'root',
      privateKey: sshPrivateKey,
    },
    create: pulumi.interpolate`set -e

# Install dependencies
apt-get update && apt-get install -y sshfs golang-go curl git unzip

# Install bun
curl -fsSL https://bun.sh/install | bash
export PATH="/root/.bun/bin:$PATH"

# Create data directories
mkdir -p /data/mkv1 /data/mkv2 /data/mkvdb /data/db

# Setup SSH key for storage boxes
mkdir -p /root/.ssh
echo '${sshPrivateKey}' > /root/.ssh/storagebox_key
chmod 600 /root/.ssh/storagebox_key

# Add storage box hosts to known_hosts
ssh-keyscan -p 23 u526268.your-storagebox.de >> /root/.ssh/known_hosts 2>/dev/null || true
ssh-keyscan -p 23 u526270.your-storagebox.de >> /root/.ssh/known_hosts 2>/dev/null || true

# Create systemd service for SSHFS mounts
cat > /etc/systemd/system/sshfs-mounts.service << 'SSHFS_EOF'
[Unit]
Description=Mount storage boxes via SSHFS
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStartPre=/bin/bash -c 'fusermount -u /data/mkv1 2>/dev/null || true'
ExecStartPre=/bin/bash -c 'fusermount -u /data/mkv2 2>/dev/null || true'
ExecStart=/usr/bin/sshfs -o IdentityFile=/root/.ssh/storagebox_key,port=23,allow_other,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 u526268@u526268.your-storagebox.de: /data/mkv1
ExecStart=/usr/bin/sshfs -o IdentityFile=/root/.ssh/storagebox_key,port=23,allow_other,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 u526270@u526270.your-storagebox.de: /data/mkv2
ExecStop=/bin/fusermount -u /data/mkv1
ExecStop=/bin/fusermount -u /data/mkv2

[Install]
WantedBy=multi-user.target
SSHFS_EOF

systemctl daemon-reload
systemctl enable sshfs-mounts
systemctl start sshfs-mounts

# Create required subdirs on storage boxes
mkdir -p /data/mkv1/tmp /data/mkv1/body_temp
mkdir -p /data/mkv2/tmp /data/mkv2/body_temp

# Clone repo if not exists
if [ ! -d /app ]; then
  git clone https://github.com/asiusai/asiusai.git /app
  cd /app && git submodule update --init
fi

# Build MKV binary
cd /app/minikeyvalue/src && go build -o mkv

# Create systemd service for API
cat > /etc/systemd/system/asius-api.service << 'EOF'
[Unit]
Description=Asius API
After=network.target sshfs-mounts.service
Requires=sshfs-mounts.service

[Service]
Type=simple
WorkingDirectory=/app
ExecStart=/app/start-api.sh
Restart=always
Environment=PORT=80
Environment=MKV_DB=/data/mkvdb
Environment=MKV_DATA1=/data/mkv1
Environment=MKV_DATA2=/data/mkv2
Environment=DB_PATH=/data/db/data.db
Environment=JWT_SECRET=${config.requireSecret('jwtSecret')}
Environment=GOOGLE_CLIENT_ID=${config.requireSecret('googleClientId')}
Environment=GOOGLE_CLIENT_SECRET=${config.requireSecret('googleClientSecret')}
Environment=API_ORIGIN=wss://api.asius.ai
Environment=SSH_API_KEY=${config.requireSecret('sshApiKey')}
Environment=R2_BUCKET=${dbBackupBucket.name}
Environment=R2_ACCOUNT_ID=${ACCOUNT_ID}
Environment=R2_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}
Environment=R2_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable asius-api

# Stop old docker services if any
systemctl stop api 2>/dev/null || true
systemctl disable api 2>/dev/null || true
docker stop asius-api 2>/dev/null || true
docker rm asius-api 2>/dev/null || true
`,
  },
  { dependsOn: [apiServer] },
)

// Push current commit to deploy branch
const pushApi = new command.local.Command('push-api-branch', {
  create: 'git push origin HEAD:refs/heads/deploy-api --force',
  dir: join(__dirname, '..'),
  triggers: [Date.now()],
})

// Deploy API to server
const deployApi = new command.remote.Command(
  'deploy-api',
  {
    connection: {
      host: apiServer.ipv4Address,
      user: 'root',
      privateKey: sshPrivateKey,
    },
    create: `set -e
export PATH="/root/.bun/bin:$PATH"

cd /app

# Fetch and checkout the deployed commit
git fetch origin deploy-api
git checkout FETCH_HEAD --force
git submodule update --init

# Install dependencies
bun install

# Rebuild MKV if source changed
cd minikeyvalue/src && go build -o mkv
cd /app

# Restart service
systemctl restart asius-api

# Wait for health
for i in $(seq 1 30); do
  if curl -sf http://localhost/health > /dev/null; then
    echo "API healthy"
    exit 0
  fi
  sleep 1
done
echo "Health check failed"
exit 1
`,
    triggers: [pushApi.stdout],
  },
  { dependsOn: [pushApi, serverSetup] },
)

export const apiDeployOutput = deployApi.stdout

// ------------------------- SSH PROXY SERVER -------------------------
const sshFirewall = new hcloud.Firewall('ssh-firewall', {
  rules: [
    { direction: 'in', protocol: 'tcp', port: '22', sourceIps: ['0.0.0.0/0', '::/0'] },
    { direction: 'in', protocol: 'tcp', port: '2222', sourceIps: ['0.0.0.0/0', '::/0'] }, // SSH proxy
    { direction: 'in', protocol: 'tcp', port: '80', sourceIps: ['0.0.0.0/0', '::/0'] }, // HTTP (for ACME)
    { direction: 'in', protocol: 'tcp', port: '443', sourceIps: ['0.0.0.0/0', '::/0'] }, // HTTPS WebSocket
  ],
})

const sshProxyServer = new hcloud.Server('ssh-server', {
  serverType: 'cax11',
  image: 'ubuntu-24.04',
  location: 'fsn1',
  sshKeys: [sshKey.id],
  firewallIds: [sshFirewall.id.apply((id) => parseInt(id, 10))],
})

// SSH proxy - direct to IP (not proxied, SSH needs direct connection)
new cloudflare.DnsRecord('ssh-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'ssh',
  type: 'A',
  content: sshProxyServer.ipv4Address,
  proxied: false,
  ttl: 1,
})

// Temporary alias while rate-limited on ssh.asius.ai
new cloudflare.DnsRecord('ssh2-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'ssh2',
  type: 'A',
  content: sshProxyServer.ipv4Address,
  proxied: false,
  ttl: 1,
})

// One-time SSH server setup
const sshServerSetup = new command.remote.Command(
  'ssh-server-setup',
  {
    connection: {
      host: sshProxyServer.ipv4Address,
      user: 'root',
      privateKey: sshPrivateKey,
    },
    create: pulumi.interpolate`set -e

# Install dependencies
apt-get update && apt-get install -y curl git unzip

# Install bun
curl -fsSL https://bun.sh/install | bash
export PATH="/root/.bun/bin:$PATH"

# Install Caddy
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# Clone repo if not exists
if [ ! -d /app ]; then
  git clone https://github.com/asiusai/asiusai.git /app
fi

# Create systemd service for SSH proxy
cat > /etc/systemd/system/asius-ssh.service << 'EOF'
[Unit]
Description=Asius SSH Proxy
After=network.target

[Service]
Type=simple
WorkingDirectory=/app/ssh
ExecStart=/app/ssh/start.sh
Restart=always
Environment=SSH_PORT=2222
Environment=WS_PORT=8080
Environment=API_KEY=${config.requireSecret('sshApiKey')}
Environment=WS_ORIGIN=wss://ssh2.asius.ai

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable asius-ssh

# Stop old docker services if any
docker stop asius-ssh 2>/dev/null || true
docker rm asius-ssh 2>/dev/null || true
`,
  },
  { dependsOn: [sshProxyServer] },
)

// Push current commit to deploy branch for SSH
const pushSsh = new command.local.Command('push-ssh-branch', {
  create: 'git push origin HEAD:refs/heads/deploy-ssh --force',
  dir: join(__dirname, '..'),
  triggers: [Date.now()],
})

// Deploy SSH proxy to server
const deploySsh = new command.remote.Command(
  'deploy-ssh',
  {
    connection: {
      host: sshProxyServer.ipv4Address,
      user: 'root',
      privateKey: sshPrivateKey,
    },
    create: `set -e
export PATH="/root/.bun/bin:$PATH"

cd /app

# Fetch and checkout the deployed commit
git fetch origin deploy-ssh
git checkout FETCH_HEAD --force

# Install dependencies
cd ssh && bun install
cd /app

# Restart service
systemctl restart asius-ssh

# Wait for health
sleep 3
curl -sf https://ssh2.asius.ai/health || echo "Health check via HTTPS not ready yet (may need Caddy to get cert)"
echo "SSH proxy deployed"
`,
    triggers: [pushSsh.stdout],
  },
  { dependsOn: [pushSsh, sshServerSetup] },
)

export const sshDeployOutput = deploySsh.stdout
