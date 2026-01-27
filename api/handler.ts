import { fetchRequestHandler } from '@ts-rest/serverless/fetch'
import { contract } from '../shared/contract'
import { auth } from './auth'
import { getClientIp, rateLimit } from './ratelimit'
import { router } from './router'
import { dataHandler } from './router/data'
import { WebSocketData } from './ws'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const getOrigin = (url: URL) => (url.origin.includes('localhost') ? url.origin : url.origin.replace('http://', 'https://'))

// Convert form-encoded requests to JSON so ts-rest can handle both formats
const normalizeRequest = async (req: Request): Promise<Request> => {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('application/x-www-form-urlencoded')) return req

  const text = await req.text()
  const params = new URLSearchParams(text)
  const body = Object.fromEntries(params.entries())

  const newHeaders = new Headers(req.headers)
  newHeaders.set('content-type', 'application/json')

  return new Request(req.url, {
    method: req.method,
    headers: newHeaders,
    body: JSON.stringify(body),
  })
}

export const handler = async (req: Request, server: Bun.Server<WebSocketData>) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 3000)) return new Response('Too many requests', { status: 429, headers: { ...headers, 'Retry-After': '60' } })

  const url = new URL(req.url)
  const identity = await auth(req)

  if (url.pathname === '/') return new Response('Hello! How are you?')

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
    request: await normalizeRequest(req),
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
}
