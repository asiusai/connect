import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { router } from './router'
import { openApiDoc, swaggerHtml } from './swagger'
import { env } from '../connect/src/utils/env'
import { contract } from '../connect/src/api/contract'
import { parse } from '../connect/src/utils/helpers'
import { db } from './db/client'
import { athenaPingsTable } from './db/schema'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}
type WebSocketData = { dongleId: string }
const server = Bun.serve({
  port: 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,
  websocket: {
    data: {} as WebSocketData,
    open: async (ws) => {
      await db.insert(athenaPingsTable).values({ dongle_id: ws.data.dongleId })
      console.log(`WS open ${ws.data.dongleId}`)
    },
    close: async (ws) => {
      await db.insert(athenaPingsTable).values({ dongle_id: ws.data.dongleId })
      console.log(`WS close ${ws.data.dongleId}`)
    },
    message: async (ws, msg) => {
      await db.insert(athenaPingsTable).values({ dongle_id: ws.data.dongleId })
      const message = typeof msg === 'string' ? parse<{ method: string }>(msg) : undefined
      console.log(`WS message ${ws.data.dongleId} ${message?.method}`)
    },
  },
  fetch: async (req, server) => {
    try {
      if (req.method === 'OPTIONS') return new Response(null, { headers })

      const url = new URL(req.url)
      console.log(req.method, url.pathname)

      // WS
      if (url.pathname.startsWith('/ws/v2/')) {
        const dongleId = url.pathname.replace(`/ws/v2/`, '')
        if (dongleId && server.upgrade(req, { data: { dongleId } })) return

        console.error(`WS failed for ${dongleId}`)
        return new Response('WS failed', { status: 400 })
      }

      // SWAGGER
      if (url.pathname === '/') return new Response(swaggerHtml, { headers: { ...headers, 'Content-Type': 'text/html' } })
      if (url.pathname === '/openapi.json') return Response.json(openApiDoc, { headers })

      // DATA HOST
      if (url.pathname.startsWith(`/${env.USER_CONTENT_DIR}`)) {
        return new Response(Bun.file(url.pathname.slice(1)), {
          headers: { ...headers, 'Content-Disposition': `attachment; filename="${url.pathname.split('/').pop()}"` },
        })
      }

      // API ROUTES
      const token = req.headers.get('Authorization')?.replace('JWT ', '')
      const res = await fetchRequestHandler({
        contract,
        router,
        request: req,
        platformContext: { token },
        options: {},
      })
      console.log(req.method, url.pathname, res.status)

      Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

      return res
    } catch (e) {
      console.error(e)
      return new Response(`Server error: ${e}`, { status: 500 })
    }
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)
