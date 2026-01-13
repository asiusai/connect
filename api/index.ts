import { restoreFromR2, startBackupSchedule } from './db/backup'
import { dataHandler } from './router/data'
await restoreFromR2()

const { fetchRequestHandler } = await import('@ts-rest/serverless/fetch')
const { router } = await import('./router')
const { contract } = await import('../connect/src/api/contract')
const { websocket } = await import('./ws')
const { auth } = await import('./auth')
const { startQueueWorker } = await import('./processing/queue')
const { rateLimit, getClientIp } = await import('./ratelimit')

type WebSocketData = { dongleId: string; device: unknown }

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const getOrigin = (url: URL) => (url.origin.includes('localhost') ? url.origin : url.origin.replace('http://', 'https://'))

const server = Bun.serve<WebSocketData>({
  port: Number(process.env.PORT) || 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,

  websocket,

  fetch: async (req, server) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers })

    const ip = getClientIp(req)
    if (!rateLimit(ip, 3000)) return new Response('Too many requests', { status: 429, headers: { ...headers, 'Retry-After': '60' } })

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

    // MKV
    if (url.pathname.startsWith('/connectdata/')) return await dataHandler(req, identity)

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
      (identity ? `${identity.type === 'user' ? (identity.user.superuser ? 'super' : 'user') : 'device'}(${identity.id})` : '-').padEnd(24),
      url.pathname,
    )

    return res
  },
})

console.log(`Started server on http://${server.hostname}:${server.port}`)

startQueueWorker()
startBackupSchedule()
