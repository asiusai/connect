import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { router } from './router'
import { contract } from '../connect/src/api/contract'
import { websocket, WebSocketData } from './ws'
import { sshWebsocket, SshWebSocketData, getSshSession, createSshSession, notifyDeviceForSsh } from './ssh'
import { auth, Identity } from './auth'
import { startQueueWorker } from './processing/queue'
import { rateLimit, getClientIp } from './ratelimit'

type AllWebSocketData = WebSocketData | SshWebSocketData

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const handle = async (req: Request, server: Bun.Server<AllWebSocketData>, identity?: Identity): Promise<Response | undefined> => {
  const url = new URL(req.url)

  // Athena WS (device connection)
  if (url.pathname.startsWith('/ws/v2/')) {
    const dongleId = url.pathname.replace(`/ws/v2/`, '')
    if (!identity || identity.type !== 'device' || identity.device.dongle_id !== dongleId) {
      return new Response(`Bad request: ${JSON.stringify({ identity, headers: req.headers })}`, { status: 400 })
    }

    if (server.upgrade(req, { data: { dongleId, device: identity.device } })) return
    else return new Response('WS upgrade failed', { status: 400 })
  }

  // SSH WebSocket relay - direct connection at /ssh/{dongleId}
  // No auth required for clients - SSH protocol handles authentication via GitHub keys on device
  if (url.pathname.startsWith('/ssh/')) {
    const pathId = url.pathname.replace('/ssh/', '')

    // Check if this is a device connecting to an existing session
    if (identity?.type === 'device') {
      const session = getSshSession(pathId)
      if (!session) {
        return new Response('Session not found', { status: 404 })
      }
      if (identity.device.dongle_id !== session.dongleId) {
        return new Response('Unauthorized', { status: 401 })
      }
      if (server.upgrade(req, { data: { sessionId: pathId, type: 'device', dongleId: session.dongleId } })) return
      else return new Response('WS upgrade failed', { status: 400 })
    }

    // Client connecting - pathId is the dongleId
    // Create session and notify device to connect
    const dongleId = pathId
    const sessionId = createSshSession(dongleId)
    const origin = url.origin.includes('localhost') ? url.origin : url.origin.replace('http://', 'https://')

    // Tell device to connect (don't await - let it happen async)
    notifyDeviceForSsh(dongleId, sessionId, origin).then((res) => {
      if (res.error) console.error(`SSH session ${sessionId}: device notification failed:`, res.error)
    })

    if (server.upgrade(req, { data: { sessionId, type: 'client', dongleId } })) return
    else return new Response('WS upgrade failed', { status: 400 })
  }

  // for cloudflare the origin has only http://, but we should use https://
  const origin = url.origin.includes('localhost') ? url.origin : url.origin.replace('http://', 'https://')

  // API ROUTES
  const res = await fetchRequestHandler({
    contract,
    router,
    request: req,
    platformContext: { identity, origin },
    options: { responseValidation: true },
  })

  Object.entries(headers).forEach(([key, value]) => res.headers.set(key, value))

  return res
}

// Combined WebSocket handler that dispatches to athena or SSH handlers
const combinedWebsocket: Bun.WebSocketHandler<AllWebSocketData> = {
  open: (ws) => {
    if ('sessionId' in ws.data) {
      sshWebsocket.open?.(ws as Bun.ServerWebSocket<SshWebSocketData>)
    } else {
      websocket.open?.(ws as Bun.ServerWebSocket<WebSocketData>)
    }
  },
  close: (ws, code, reason) => {
    if ('sessionId' in ws.data) {
      sshWebsocket.close?.(ws as Bun.ServerWebSocket<SshWebSocketData>, code, reason)
    } else {
      websocket.close?.(ws as Bun.ServerWebSocket<WebSocketData>, code, reason)
    }
  },
  message: (ws, msg) => {
    if ('sessionId' in ws.data) {
      sshWebsocket.message?.(ws as Bun.ServerWebSocket<SshWebSocketData>, msg)
    } else {
      websocket.message?.(ws as Bun.ServerWebSocket<WebSocketData>, msg)
    }
  },
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,
  websocket: combinedWebsocket,
  fetch: async (req, server) => {
    try {
      if (req.method === 'OPTIONS') return new Response(null, { headers })

      // Rate limit: 300 requests per minute per IP
      const ip = getClientIp(req)
      if (!rateLimit(ip, 300)) return new Response('Too many requests', { status: 429, headers: { ...headers, 'Retry-After': '60' } })

      const identity = await auth(req)
      const res = await handle(req, server, identity)
      console[res && res.status >= 400 ? 'error' : 'log'](
        req.method.padEnd(5),
        res?.status ?? 200,
        (identity ? `${identity.type}(${identity.id})` : '-').padEnd(24),
        req.url.split('?')[0],
      )
      if (!res) return
      return res
    } catch (e) {
      console.log(e)
      return new Response(`Internal error: ${e}`, { status: 500 })
    }
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)

startQueueWorker()
