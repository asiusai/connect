import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { router } from './router'
import { openApiDoc, swaggerHtml } from './swagger'
import { contract } from '../connect/src/api/contract'
import { getDevice } from './common'
import { websocket } from './ws'
import { startMkv } from './mkv'
import { env } from './env'

await startMkv()

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,
  websocket,
  fetch: async (req, server) => {
    try {
      if (req.method === 'OPTIONS') return new Response(null, { headers })

      const url = new URL(req.url)

      // SWAGGER
      if (url.pathname === '/') return new Response(swaggerHtml, { headers: { ...headers, 'Content-Type': 'text/html' } })
      if (url.pathname === '/openapi.json') return Response.json(openApiDoc, { headers })

      const token = req.headers.get('Authorization')?.replace('JWT ', '') ?? req.headers.get('cookie')?.replace('jwt=', '')

      // WS
      if (url.pathname.startsWith('/ws/v2/')) {
        const dongleId = url.pathname.replace(`/ws/v2/`, '')
        const device = await getDevice(dongleId, token)
        if (device && server.upgrade(req, { data: { dongleId, device } })) return

        console.error(`WS failed for ${dongleId}`)
        return new Response('WS failed', { status: 400 })
      }

      // STORAGE PROXY - /storage/:dongleId/path/to/file
      if (url.pathname.startsWith('/storage/')) {
        const path = url.pathname.replace('/storage/', '')
        // const dongleId = path.split('/')[0]
        // const device = await getDevice(dongleId, token)
        // if (!device) return new Response('Unauthorized', { status: 401, headers })

        const res = await fetch(`http://localhost:${env.MKV_PORT}/${path}`, { method: req.method, body: req.body, redirect: 'follow' })
        console[res.status < 400 ? 'log' : 'error'](req.method, url.pathname, res.status)
        return new Response(res.body, {
          status: res.status,
          headers: { ...headers, 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' },
        })
      }

      // API ROUTES
      const res = await fetchRequestHandler({
        contract,
        router,
        request: req,
        platformContext: { token },
        options: {},
      })
      console[res.status < 400 ? 'log' : 'error'](req.method, url.pathname, res.status)

      Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

      return res
    } catch (e) {
      console.error(e)
      return new Response(`Server error: ${e}`, { status: 500 })
    }
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)
