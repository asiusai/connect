import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { router } from './router'
import { openApiDoc, swaggerHtml } from './swagger'
import { contract } from '../connect/src/api/contract'
import { websocket, WebSocketData } from './ws'
import { startMkv } from './mkv'
import { env } from './env'
import { auth, Identity } from './auth'

await startMkv()

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const handle = async (req: Request, server: Bun.Server<WebSocketData>, identity?: Identity): Promise<Response | undefined> => {
  const url = new URL(req.url)

  // SWAGGER
  if (url.pathname === '/') return new Response(swaggerHtml, { headers: { ...headers, 'Content-Type': 'text/html' } })
  if (url.pathname === '/openapi.json') return Response.json(openApiDoc, { headers })

  // WS
  if (url.pathname.startsWith('/ws/v2/')) {
    const dongleId = url.pathname.replace(`/ws/v2/`, '')
    if (identity && identity.type === 'device' && server.upgrade(req, { data: { dongleId, device: identity.device } })) return

    console.error(`WS failed for ${dongleId}`)
    return new Response('WS failed', { status: 400 })
  }

  // TODO: move to tsrest
  if (url.pathname.startsWith('/connectdata/')) {
    const path = url.pathname.replace('/connectdata/', '')
    if (!identity) return

    const res = await fetch(`http://localhost:${env.MKV_PORT}/${path}`, { method: req.method, body: req.body, redirect: 'follow' })
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
    platformContext: { identity, origin: url.origin },
    options: {},
  })

  Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

  return res
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,
  websocket,
  fetch: async (req, server) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers })
    const identity = await auth(req)
    const res = await handle(req, server, identity).catch((e) => {
      console.error(e)
      return new Response(`Server error: ${e}`, { status: 500 })
    })
    if (!res) return
    console[res.status < 400 ? 'log' : 'error'](req.method, res.status, (identity ? `${identity.type}(${identity.id})` : '-').padEnd(24), req.url)
    return res
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)
