import * as cloudflare from '@pulumi/cloudflare'
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

// ------------------------- COMMA CONNECT -------------------------
const comma = new cloudflare.PagesProject('comma-connect', {
  accountId: ACCOUNT_ID,
  name: 'comma-connect',
  productionBranch: 'master',
  buildConfig: {
    buildCommand: 'bun i && bun run --bun vite build --mode comma',
    destinationDir: 'dist',
  },
  source: {
    type: 'github',
    config: {
      owner: 'asiusai',
      repoName: 'connect',
      prCommentsEnabled: true,
    },
  },
})

new cloudflare.PagesDomain('comma-connect-domain', {
  accountId: ACCOUNT_ID,
  projectName: comma.name,
  name: 'comma.asius.ai',
})

new cloudflare.DnsRecord('comma-connect-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'comma',
  type: 'CNAME',
  content: 'comma-connect.pages.dev',
  proxied: true,
  ttl: 1,
})

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

// ------------------------- KONIK CONNECT -------------------------
const konik = new cloudflare.PagesProject('konik-connect', {
  accountId: ACCOUNT_ID,
  name: 'konik-connect',
  productionBranch: 'master',
  buildConfig: {
    buildCommand: 'bun i && bun run --bun vite build --mode konik',
    destinationDir: 'dist',
  },
  source: {
    type: 'github',
    config: {
      owner: 'asiusai',
      repoName: 'connect',
      prCommentsEnabled: true,
    },
  },
})

new cloudflare.PagesDomain('konik-connect-domain', {
  accountId: ACCOUNT_ID,
  projectName: konik.name,
  name: 'konik.asius.ai',
})

new cloudflare.DnsRecord('konik-connect-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'konik',
  type: 'CNAME',
  content: 'konik-connect.pages.dev',
  proxied: true,
  ttl: 1,
})

// ------------------------- ASIUS CONNECT -------------------------
const connect = new cloudflare.PagesProject('asius-connect', {
  accountId: ACCOUNT_ID,
  name: 'asius-connect',
  productionBranch: 'master',
  buildConfig: {
    buildCommand: 'bun i && bun run --bun vite build --mode asius',
    destinationDir: 'dist',
  },
  source: {
    type: 'github',
    config: {
      owner: 'asiusai',
      repoName: 'connect',
      prCommentsEnabled: true,
    },
  },
})

new cloudflare.PagesDomain('asius-connect-domain', {
  accountId: ACCOUNT_ID,
  projectName: connect.name,
  name: 'connect.asius.ai',
})

new cloudflare.DnsRecord('asius-connect-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'connect',
  type: 'CNAME',
  content: 'asius-connect.pages.dev',
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
  userData: `#!/bin/bash
cd /root
git clone https://github.com/asiusai/asiusai.git
cd asiusai
git submodule update --init connect
docker build -f Dockerfile.api -t api .
docker run -d --restart=always -p 80:8080 api
`,
})

new cloudflare.DnsRecord('api-dns', {
  zoneId: ASIUS_ZONE_ID,
  name: 'api',
  type: 'A',
  content: apiServer.ipv4Address,
  proxied: true,
  ttl: 1,
})
