import * as cloudflare from '@pulumi/cloudflare'

const ACCOUNT_ID = '558df022e422781a34f239d7de72c8ae'
const ZONE_ID = '9dbe2445beeb3c44e991656fada0231c'

// PROXIES
const deployProxy = (original: string, proxy: string) => {
  const name = proxy.replaceAll('.new-connect.dev', '')
  const worker = new cloudflare.WorkersScript(name, {
    accountId: ACCOUNT_ID,
    scriptName: name,
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

  new cloudflare.DnsRecord(`${name}-dns`, {
    zoneId: ZONE_ID,
    name: name,
    type: 'AAAA',
    content: '100::',
    proxied: true,
    ttl: 1,
  })

  new cloudflare.WorkersRoute(`${name}-route`, {
    zoneId: ZONE_ID,
    pattern: `${proxy}/*`,
    script: worker.scriptName,
  })
}

deployProxy('api.konik.ai', 'konik-proxy.new-connect.dev')
deployProxy('athena.comma.ai', 'athena-proxy.new-connect.dev')
deployProxy('billing.comma.ai', 'billing-proxy.new-connect.dev')

// NEW-CONNECT
const newConnect = new cloudflare.PagesProject('new-connect', {
  accountId: ACCOUNT_ID,
  name: 'new-connect',
  productionBranch: 'master',
  buildConfig: {
    buildCommand: 'bun i && bun run --bun vite build',
    destinationDir: 'dist',
  },
  source: {
    type: 'github',
    config: {
      owner: 'karelnagel',
      repoName: 'new-connect',
      prCommentsEnabled: true,
    },
  },
})

new cloudflare.PagesDomain('new-connect-domain', {
  accountId: ACCOUNT_ID,
  projectName: newConnect.name,
  name: 'new-connect.dev',
})

// KONIK NEW-CONNECT
const konikNewConnect = new cloudflare.PagesProject('konik-new-connect', {
  accountId: ACCOUNT_ID,
  name: 'konik-new-connect',
  productionBranch: 'master',
  buildConfig: {
    buildCommand: 'bun i && bun run --bun vite build --mode konik',
    destinationDir: 'dist',
  },
  source: {
    type: 'github',
    config: {
      owner: 'karelnagel',
      repoName: 'new-connect',
      prCommentsEnabled: true,
    },
  },
})

new cloudflare.PagesDomain('konik-new-connect-domain', {
  accountId: ACCOUNT_ID,
  projectName: konikNewConnect.name,
  name: 'konik.new-connect.dev',
})
