import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { router } from './router'
import { contract } from '../connect/src/api/contract'
import { websocket, WebSocketData } from './ws'
import { SshSocketData, getSshSession, createSshSession, handleSshOpen, handleSshClose, handleSshMessage } from './ssh'
import { auth } from './auth'
import { startQueueWorker } from './processing/queue'
import { rateLimit, getClientIp } from './ratelimit'
import { startSshServer } from './ssh-server'

type WsData = WebSocketData | SshSocketData

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const getOrigin = (url: URL) => (url.origin.includes('localhost') ? url.origin : url.origin.replace('http://', 'https://'))

const isSshSocket = (data: WsData): data is SshSocketData => 'sessionId' in data

const server = Bun.serve<WsData>({
  port: Number(process.env.PORT) || 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,

  websocket: {
    open: (ws) => (isSshSocket(ws.data) ? handleSshOpen(ws as any) : websocket.open?.(ws as any)),
    close: (ws, code, reason) => (isSshSocket(ws.data) ? handleSshClose(ws as any) : websocket.close?.(ws as any, code, reason)),
    message: (ws, msg) => (isSshSocket(ws.data) ? handleSshMessage(ws as any, msg) : websocket.message?.(ws as any, msg)),
  },

  fetch: async (req, server) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers })

    const ip = getClientIp(req)
    if (!rateLimit(ip, 300)) return new Response('Too many requests', { status: 429, headers: { ...headers, 'Retry-After': '60' } })

    const url = new URL(req.url)
    const identity = await auth(req)

    // Athena WS (device connection)
    if (url.pathname.startsWith('/ws/v2/')) {
      const dongleId = url.pathname.slice(7)
      if (identity?.type !== 'device' || identity.device.dongle_id !== dongleId) {
        return new Response('Unauthorized', { status: 401 })
      }
      return server.upgrade(req, { data: { dongleId, device: identity.device } }) ? undefined : new Response('WS upgrade failed', { status: 400 })
    }

    // SSH relay
    if (url.pathname.startsWith('/ssh/')) {
      const pathId = url.pathname.slice(5)

      // Device connecting to existing session
      if (identity?.type === 'device') {
        const session = getSshSession(pathId)
        if (!session || identity.device.dongle_id !== session.dongleId) {
          return new Response('Unauthorized', { status: 401 })
        }
        return server.upgrade(req, { data: { sessionId: pathId, type: 'device', dongleId: session.dongleId } })
          ? undefined
          : new Response('WS upgrade failed', { status: 400 })
      }

      // Client connecting - create session and upgrade
      const sessionId = await createSshSession(pathId, getOrigin(url))
      return server.upgrade(req, { data: { sessionId, type: 'client', dongleId: pathId } }) ? undefined : new Response('WS upgrade failed', { status: 400 })
    }

    // API routes
    const res = await fetchRequestHandler({
      contract,
      router,
      request: req,
      platformContext: { identity, origin: getOrigin(url) },
      options: { responseValidation: true },
    })

    Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

    console[res.status >= 400 ? 'error' : 'log'](
      req.method.padEnd(5),
      res.status,
      (identity ? `${identity.type}(${identity.id})` : '-').padEnd(24),
      url.pathname,
    )

    return res
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)

startQueueWorker()
startSshServer(2222)
