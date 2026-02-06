import * as cloudflare from '@pulumi/cloudflare'
import * as hcloud from '@pulumi/hcloud'
import * as pulumi from '@pulumi/pulumi'
import { createHash } from 'crypto'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { Site } from './Site'
import { Worker } from './Worker'
import { Server } from './Server'

const folderHash = (...paths: string[]): string => {
  const hash = createHash('md5')
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === 'node_modules') continue
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else hash.update(readFileSync(full))
    }
  }
  for (const path of paths) walk(path)
  return hash.digest('hex')
}

const config = new pulumi.Config()

// ------------------------- CONSTS -------------------------
const accountId = '558df022e422781a34f239d7de72c8ae'
const zoneId = 'f4c49c38916764f43e3854fb5461db31'

// ------------------------- BUCKETS -------------------------
const dbBackupBucket = new cloudflare.R2Bucket('db-backup-bucket', {
  accountId,
  name: 'asius-db-backup',
})

const agnosBucket = new cloudflare.R2Bucket('agnos-bucket', {
  accountId,
  name: 'asius-agnos',
})

// Enable public access via r2.dev domain
const agnosPublicAccess = new cloudflare.R2ManagedDomain('agnos-public', {
  accountId,
  bucketName: agnosBucket.name,
  enabled: true,
})

export const agnosPublicUrl = agnosPublicAccess.domain

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
new Worker('asius-installer', {
  accountId,
  zoneId,
  domain: 'installer.asius.ai',
  file: './workers/installer.js',
})

// ------------------------- SITES -------------------------
new Site('asius-connect', {
  accountId,
  zoneId,
  rootDir: 'connect',
  buildCommand: 'bun i && bun run --bun vite build',
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

const storageBoxPassword = config.requireSecret('storageBoxPassword')

const STORAGE_BOX_USER = 'u526268'

export const api = new Server('api', {
  allowedPorts: ['22', '80', '443'],
  sshKeyId: sshKey.id,
  serverType: 'cpx32',
  domain: { name: 'api.asius.ai', zoneId },
  sshPrivateKey,
  services: [
    {
      name: 'asius-volume',
      check: 'mountpoint -q /data/volume',
      trigger: undefined,
      service: {
        Unit: {
          Description: 'Storage Box Mount',
          After: 'network.target',
        },
        Service: {
          Type: 'oneshot',
          RemainAfterExit: 'yes',
          ExecStartPre: `/bin/bash -c 'umount /data/volume 2>/dev/null || true'`,
          ExecStart: `/bin/mount -t cifs //${STORAGE_BOX_USER}.your-storagebox.de/backup /data/volume -o username=${STORAGE_BOX_USER},password=\${STORAGE_BOX_PASSWORD},uid=0,gid=0,file_mode=0660,dir_mode=0770`,
          ExecStop: '/bin/umount /data/volume',
          EnvironmentFile: '/etc/storagebox.env',
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
    },
    {
      name: 'asius-caddy',
      check: 'until curl -sf http://localhost:80/health; do sleep 0.5; done',
      trigger: undefined,
      service: {
        Unit: {
          Description: 'Caddy web server for API',
          After: 'network.target',
        },
        Service: {
          Type: 'simple',
          ExecStart: '/usr/bin/caddy run --config /app/api/Caddyfile',
          ExecReload: '/usr/bin/caddy reload --config /app/api/Caddyfile',
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
      name: 'asius-api',
      check: 'until curl -sf http://localhost:8080/health; do sleep 0.5; done',
      trigger: folderHash('../api', '../shared'),
      service: {
        Unit: {
          Description: 'Asius API',
          After: 'network.target asius-volume.service asius-caddy.service',
          Requires: 'asius-volume.service',
        },
        Service: {
          Type: 'simple',
          WorkingDirectory: '/app/api',
          ExecStart: 'SUPERUSERS=nagelkarel@gmail.com bun run index.ts',
          Restart: 'always',
          Environment: {
            PORT: '8080',
            VOLUME_PATH: '/data/volume',
            DB_PATH: '/data/asius.db',
            JWT_SECRET: config.requireSecret('jwtSecret'),
            GOOGLE_CLIENT_ID: config.requireSecret('googleClientId'),
            GOOGLE_CLIENT_SECRET: config.requireSecret('googleClientSecret'),
            GITHUB_CLIENT_ID: config.requireSecret('githubClientId'),
            GITHUB_CLIENT_SECRET: config.requireSecret('githubClientSecret'),
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
apt-get update && apt-get install -y cifs-utils curl git unzip ffmpeg debian-keyring debian-archive-keyring apt-transport-https

# Install bun
curl -fsSL https://bun.sh/install | bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun

# Install Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# Stop default Caddy service (we use our own)
systemctl stop caddy || true
systemctl disable caddy || true

# Create data directories
mkdir -p /data/volume /data/caddy /app

# Setup storage box password
echo 'STORAGE_BOX_PASSWORD=${storageBoxPassword}' > /etc/storagebox.env
chmod 600 /etc/storagebox.env
`,
  deployScript: 'cd /app/api && bun install',
})

// ------------------------- SSH SERVER -------------------------
export const ssh = new Server('ssh', {
  allowedPorts: ['22', '2222', '80', '443'],
  serverType: 'cpx22',
  sshPrivateKey,
  sshKeyId: sshKey.id,
  domain: { name: 'ssh.asius.ai', zoneId },
  services: [
    {
      name: 'asius-caddy',
      check: 'until curl -sf http://localhost:80/health; do sleep 0.5; done',
      trigger: undefined,
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
      trigger: folderHash('../ssh', '../shared'),
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
            WS_ORIGIN: 'wss://ssh.asius.ai',
            SSH_PRIVATE_KEY: config.requireSecret('browserSshPrivateKey'),
            ENCRYPTION_PRIVATE_KEY: config.requireSecret('encryptionPrivateKey'),
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
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# Create data directory
mkdir -p /data/caddy

# Write SSH key for browser connections
echo '${config.requireSecret('browserSshPrivateKey')}' | sed 's/\\\\n/\\n/g' > /data/browser-ssh-key
chmod 600 /data/browser-ssh-key

# Stop default Caddy service (we use our own)
systemctl stop caddy || true
systemctl disable caddy || true
`,
  deployScript: 'cd /app/ssh && bun install',
})

// ------------------------- ARM BUILD SERVER -------------------------
const ghRunnerToken = config.requireSecret('ghRunnerToken')

export const build = new Server('build', {
  allowedPorts: ['22'],
  serverType: 'cax21', // ARM64: 4 cores, 8GB RAM, 80GB disk
  sshPrivateKey,
  sshKeyId: sshKey.id,
  services: [
    {
      name: 'github-runner',
      check: 'pgrep -f Runner.Listener',
      trigger: undefined,
      service: {
        Unit: {
          Description: 'GitHub Actions Runner',
          After: 'network.target',
        },
        Service: {
          Type: 'simple',
          User: 'runner',
          WorkingDirectory: '/home/runner/actions-runner',
          ExecStart: '/home/runner/actions-runner/run.sh',
          Restart: 'always',
          RestartSec: '5',
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
    },
  ],
  createScript: pulumi.interpolate`set -e
# Install build dependencies for openpilot
apt-get update && apt-get install -y \
  curl git git-lfs unzip build-essential \
  python3 python3-pip python3-venv \
  clang cmake scons libffi-dev libssl-dev \
  liblzma-dev libsqlite3-dev libncurses5-dev \
  libncursesw5-dev libreadline-dev libbz2-dev \
  libopenblas-dev liblapack-dev libatlas-base-dev \
  opencl-headers ocl-icd-opencl-dev \
  libcapnp-dev capnproto \
  libzmq3-dev libsystemd-dev \
  libyaml-dev jq \
  portaudio19-dev libsndfile1-dev \
  libavformat-dev libavcodec-dev libavdevice-dev libavutil-dev libswscale-dev libswresample-dev libavfilter-dev \
  libegl1-mesa-dev libgles2-mesa-dev \
  libusb-1.0-0-dev

# Create runner user
useradd -m -s /bin/bash runner || true
mkdir -p /home/runner/actions-runner
chown -R runner:runner /home/runner

# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
cp /root/.local/bin/uv /usr/local/bin/

# Download and extract GitHub Actions runner
cd /home/runner/actions-runner
RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name' | sed 's/v//')
curl -o actions-runner-linux-arm64.tar.gz -L "https://github.com/actions/runner/releases/download/v\${RUNNER_VERSION}/actions-runner-linux-arm64-\${RUNNER_VERSION}.tar.gz"
tar xzf actions-runner-linux-arm64.tar.gz
rm actions-runner-linux-arm64.tar.gz
chown -R runner:runner /home/runner/actions-runner

# Configure runner for asiusai org (works for both openpilot and sunnypilot repos)
su - runner -c "cd /home/runner/actions-runner && ./config.sh --url https://github.com/asiusai --token ${ghRunnerToken} --name asius-arm-builder --labels self-hosted,linux,arm64,tici --unattended --replace" || true

# Create build directories
mkdir -p /data/openpilot /data/scons_cache
chown -R runner:runner /data
`,
  deployScript: 'echo "Build server ready"',
})
