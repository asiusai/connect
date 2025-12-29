import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { renderer } from '../src/api/contract'
import { router } from './router'
import { env } from '../src/utils/env'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const server = Bun.serve({
  port: 8080,
  idleTimeout: 255,
  fetch: async (request) => {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers })

      const path = new URL(request.url).pathname

      if (path.startsWith(`/${env.USER_CONTENT_DIR}`)) {
        return new Response(Bun.file(path.slice(1)), {
          headers: { ...headers, 'Content-Disposition': `attachment; filename="${path.split('/').pop()}"` },
        })
      }

      const res = await fetchRequestHandler({
        contract: renderer,
        router,
        request,
        platformContext: {},
        options: {},
      })

      Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

      return res
    } catch (e) {
      return new Response(`Server error: ${e}`, { status: 500 })
    }
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)
