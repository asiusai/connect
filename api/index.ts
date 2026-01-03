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
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers })

      const url = new URL(request.url)
      console.log(request.method, url.pathname)

      if (url.pathname === '/') return new Response(swaggerHtml, { headers: { ...headers, 'Content-Type': 'text/html' } })
      if (url.pathname === '/openapi.json') return Response.json(openApiDoc, { headers })

      if (url.pathname.startsWith(`/${env.USER_CONTENT_DIR}`)) {
        return new Response(Bun.file(url.pathname.slice(1)), {
          headers: { ...headers, 'Content-Disposition': `attachment; filename="${url.pathname.split('/').pop()}"` },
        })
      }

      const token = request.headers.get('Authorization')?.replace('JWT ', '')
      const res = await fetchRequestHandler({
        contract,
        router,
        request,
        platformContext: { token },
        options: {},
      })
      console.log(request.method, url.pathname, res.status)

      Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

      return res
    } catch (e) {
      console.error(e)
      return new Response(`Server error: ${e}`, { status: 500 })
    }
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)
