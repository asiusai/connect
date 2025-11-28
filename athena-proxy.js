const TARGET_DOMAIN = 'https://athena.comma.ai'

export default {
  fetch: async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

    const url = new URL(request.url)

    const response = await fetch(new Request(TARGET_DOMAIN + url.pathname + url.search, request))

    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Access-Control-Allow-Origin', '*')
    newResponse.headers.set('Access-Control-Allow-Methods', '*')
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, User-Agent, Authorization')
    newResponse.headers.set('Access-Control-Max-Age', '86400')

    return newResponse
  },
}
