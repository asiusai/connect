import * as cloudflare from '@pulumi/cloudflare'

// ------------------------- CONSTS -------------------------
const ACCOUNT_ID = '558df022e422781a34f239d7de72c8ae'
const NEW_CONNECT_ZONE_ID = '9dbe2445beeb3c44e991656fada0231c'
const ASIUS_ZONE_ID = 'f4c49c38916764f43e3854fb5461db31'

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
    buildCommand: 'bun i && bun run --bun vite build',
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


// ------------------------- REDIRECTS -------------------------
// TODO: remove these
const deployRedirect = (from: string, to: string) => {
  const name = from.replace('.', '-')

  new cloudflare.PageRule(`${name}-redirect`, {
    zoneId: NEW_CONNECT_ZONE_ID,
    target: `${from}/*`,
    actions: { forwardingUrl: { statusCode: 301, url: `https://${to}/$1` } },
    priority: 1,
  })
}

deployRedirect('new-connect.dev', 'comma.asius.ai')
deployRedirect('www.new-connect.dev', 'comma.asius.ai')
deployRedirect('konik.new-connect.dev', 'konik.asius.ai')
