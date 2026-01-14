import { and, eq } from 'drizzle-orm'
import { Identity } from '../auth'
import { verify } from '../common'
import { db } from '../db/client'
import { deviceUsersTable } from '../db/schema'
import { env } from '../env'
import { DataSignature } from '../helpers'
import { queueFile } from '../processing/queue'
import { mkv } from '../mkv'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

const addCors = (headers: Headers) => {
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v)
  return headers
}

const checkAccess = async (key: string, sig: string | null, identity?: Identity): Promise<'owner' | 'read_access' | null> => {
  const dongleId = key.split('/')[0]
  if (!dongleId) return null

  // Check signature
  if (sig) {
    const signature = verify<DataSignature>(sig, env.JWT_SECRET)
    if (signature && signature.key === key) return signature.permission
  }

  if (!identity) return null

  // Device auth
  if (identity.type === 'device') {
    return identity.device.dongle_id === dongleId ? 'owner' : null
  }

  // Superuser
  if (identity.user.superuser) return 'owner'

  // User with device access
  const deviceUser = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.dongle_id, dongleId), eq(deviceUsersTable.user_id, identity.user.id)),
  })
  return deviceUser?.permission ?? null
}

export const dataHandler = async (req: Request, identity?: Identity): Promise<Response> => {
  const url = new URL(req.url)
  const rawKeys = url.pathname.replace('/connectdata/', '').replaceAll('%2F', '/').replaceAll('*', '').trim().split('/').filter(Boolean)
  const key = rawKeys.join('/')
  const sig = url.searchParams.get('sig')

  // Check access (signature, device, or user)
  const permission = await checkAccess(key, sig, identity)
  if (!permission) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Only owners can PUT or DELETE
  if ((req.method === 'PUT' || req.method === 'DELETE') && permission !== 'owner') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // LIST: ?list query param
  if (url.searchParams.get('list')) {
    const res = await mkv.list(key, url.searchParams.get('start'), url.searchParams.get('limit'))
    return new Response(res.body, { status: res.status, headers: addCors(new Headers(res.headers)) })
  }

  // GET/HEAD: fetch with range support
  if (req.method === 'GET' || req.method === 'HEAD') {
    const headers: HeadersInit = {}
    const range = req.headers.get('Range')
    if (range) headers.Range = range
    const res = req.method === 'GET' ? await mkv.get(key, headers) : await mkv.head(key, headers)
    return new Response(res.body, { status: res.status, headers: addCors(new Headers(res.headers)) })
  }

  // PUT: upload file
  if (req.method === 'PUT') {
    const res = await mkv.put(key, req.body, { 'Content-Type': req.headers.get('Content-Type') || 'application/octet-stream' }, true)

    if (res.status === 201) await queueFile(key)

    return new Response(res.body, { status: res.status, headers: addCors(new Headers(res.headers)) })
  }

  // DELETE: remove file
  if (req.method === 'DELETE') {
    const res = await mkv.delete(key)
    return new Response(res.body, { status: res.status, headers: addCors(new Headers(res.headers)) })
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
}
