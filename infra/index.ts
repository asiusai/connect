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
  image: 'docker-ce',
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

// One-time server setup
const serverSetup = new command.remote.Command(
  'server-setup',
  {
    connection: {
      host: apiServer.ipv4Address,
      user: 'root',
      privateKey: sshPrivateKey,
    },
    create: `set -e

# Create data directories
mkdir -p /root/mkv /root/mkvdb
touch /root/data.db

# Stop old services if any
systemctl stop api 2>/dev/null || true
systemctl disable api 2>/dev/null || true
`,
  },
  { dependsOn: [apiServer] },
)

// Container image name
const IMAGE = 'ghcr.io/asiusai/api:latest'

// Build and push Docker image to GitHub Container Registry
const buildAndPush = new command.local.Command('build-and-push', {
  create: pulumi.interpolate`echo '${config.requireSecret('ghToken')}' | docker login ghcr.io -u asiusai --password-stdin && docker build --platform linux/amd64 -t ${IMAGE} . && docker push ${IMAGE}`,
  dir: join(__dirname, '..'),
  triggers: [Date.now()],
})

// Start container with secrets from Pulumi config
const startContainer = new command.remote.Command(
  'start-container',
  {
    connection: {
      host: apiServer.ipv4Address,
      user: 'root',
      privateKey: sshPrivateKey,
    },
    create: pulumi.interpolate`
echo '${config.requireSecret('ghToken')}' | docker login ghcr.io -u asiusai --password-stdin
docker pull ${IMAGE}
docker stop asius-api 2>/dev/null || true
docker rm asius-api 2>/dev/null || true
docker run -d \
  --name asius-api \
  --restart always \
  -p 80:80 \
  -v /root/mkv:/data/mkv \
  -v /root/mkvdb:/data/mkvdb \
  -v /root/data.db:/data/data.db \
  -e PORT=80 \
  -e MKV_DB=/data/mkvdb \
  -e MKV_DATA=/data/mkv \
  -e DB_URL=/data/data.db \
  -e JWT_SECRET='${config.requireSecret('jwtSecret')}' \
  -e GOOGLE_CLIENT_ID='${config.requireSecret('googleClientId')}' \
  -e GOOGLE_CLIENT_SECRET='${config.requireSecret('googleClientSecret')}' \
  ${IMAGE}
sleep 5
docker logs asius-api --tail 50
`,
    triggers: [buildAndPush.stdout],
  },
  { dependsOn: [buildAndPush, serverSetup] },
)

export const containerLogs = startContainer.stdout
