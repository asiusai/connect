import * as cloudflare from '@pulumi/cloudflare'

const ACCOUNT_ID = '558df022e422781a34f239d7de72c8ae'
const ZONE_ID = '9dbe2445beeb3c44e991656fada0231c'

const PROXIES = [
  { original: 'api.konik.ai', proxy: 'konik-proxy.new-connect.dev' },
  { original: 'athena.comma.ai', proxy: 'athena-proxy.new-connect.dev' },
  { original: 'billing.comma.ai', proxy: 'billing-proxy.new-connect.dev' },
]

for (const { original, proxy } of PROXIES) {
  const name = proxy.replaceAll('.new-connect.dev', '')
  const konikProxy = new cloudflare.WorkersScript(name, {
    accountId: ACCOUNT_ID,
    scriptName: name,
    mainModule: 'index.js',
    content: `
export default {
  fetch: async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })

    const url = new URL(request.url)
    const response = await fetch(new Request('https://${original}' + url.pathname + url.search, request))
    const res = new Response(response.body, response)
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', '*')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, User-Agent, Authorization')
    res.headers.set('Access-Control-Max-Age', '86400')
    return res
  },
}`,
  })

  new cloudflare.WorkersCustomDomain(`${name}-domain`, {
    accountId: ACCOUNT_ID,
    hostname: proxy,
    service: konikProxy.scriptName,
    zoneId: ZONE_ID,
  })
}

export const projects = {}
