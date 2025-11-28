const TARGET_DOMAIN = 'https://billing.comma.ai'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Authorization',
  'Access-Control-Max-Age': '86400',
}

export default {
  fetch: async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

    const url = new URL(request.url)

    const response = await fetch(new Request(TARGET_DOMAIN + url.pathname + url.search, request))

    const newResponse = new Response(response.body, response)

    Object.keys(CORS_HEADERS).forEach((key) => {
      newResponse.headers.set(key, CORS_HEADERS[key])
    })

    return newResponse
  },
}
