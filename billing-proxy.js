const TARGET_DOMAIN = 'https://billing.comma.ai'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Authorization',
  'Access-Control-Max-Age': '86400',
}
export default {
  fetch: async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    const url = new URL(request.url)

    const response = await fetch(new Request(TARGET_DOMAIN + url.pathname + url.search, request))

    return new Response(response.body, { ...response, headers: { ...response.headers, ...headers } })
  },
}
