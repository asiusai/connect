import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { router } from './router'
import { openApiDoc, swaggerHtml } from './swagger'
import { env } from '../connect/src/utils/env'
import { contract } from '../connect/src/api/contract'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const server = Bun.serve({
  port: 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,
  fetch: async (request) => {
    console.log(request.method, new URL(request.url).pathname)
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers })

      const path = new URL(request.url).pathname

      if (path === '/') return new Response(swaggerHtml, { headers: { ...headers, 'Content-Type': 'text/html' } })
      if (path === '/openapi.json') return Response.json(openApiDoc, { headers })

      if (path.startsWith(`/${env.USER_CONTENT_DIR}`)) {
        return new Response(Bun.file(path.slice(1)), {
          headers: { ...headers, 'Content-Disposition': `attachment; filename="${path.split('/').pop()}"` },
        })
      }

      const res = await fetchRequestHandler({
        contract,
        router,
        request,
        platformContext: {},
        options: {},
      })

      Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

      return res
    } catch (e) {
      console.error(e)
      return new Response(`Server error: ${e}`, { status: 500 })
    }
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)
