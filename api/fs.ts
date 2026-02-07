import { env } from './env'

const key2path = (key: string) => {
  const fsKey = `/${key}`
  const hash = new Bun.CryptoHasher('md5').update(fsKey).digest()
  const b64 = Buffer.from(fsKey).toString('base64')
  return `sv00/${hash[0].toString(16).padStart(2, '0')}/${hash[1].toString(16).padStart(2, '0')}/${b64}`
}

const url = new URL(env.STORAGEBOX_URL!)
const auth = `Basic ${Buffer.from(`${url.username}:${url.password}`).toString('base64')}`
url.username = ''
url.password = ''
const base = url.toString().replace(/\/$/, '')

export const fs = {
  key2path,

  get: async (key: string, headers?: HeadersInit): Promise<Response> => {
    const path = key2path(key)
    const h = new Headers(headers)
    const range = h.get('Range')

    const res = await fetch(`${base}/${path}`, {
      headers: range ? { Authorization: auth, Range: range } : { Authorization: auth },
    })

    if (res.status === 404) return new Response('Not Found', { status: 404 })
    if (!res.ok) return new Response(res.statusText, { status: res.status })

    const resHeaders: HeadersInit = { 'Accept-Ranges': 'bytes' }
    const contentLength = res.headers.get('Content-Length')
    const contentRange = res.headers.get('Content-Range')
    if (contentLength) resHeaders['Content-Length'] = contentLength
    if (contentRange) resHeaders['Content-Range'] = contentRange

    return new Response(res.body, { status: res.status, headers: resHeaders })
  },

  head: async (key: string): Promise<Response> => {
    const path = key2path(key)
    const res = await fetch(`${base}/${path}`, { method: 'HEAD', headers: { Authorization: auth } })

    if (!res.ok) return new Response(null, { status: 404 })
    return new Response(null, {
      headers: { 'Content-Length': res.headers.get('Content-Length') ?? '0' },
    })
  },

  put: async (key: string, body: ReadableStream<Uint8Array> | Blob | null, _headers?: HeadersInit, overwrite = false): Promise<Response> => {
    const path = key2path(key)

    if (!overwrite) {
      const exists = await fetch(`${base}/${path}`, { method: 'HEAD', headers: { Authorization: auth } })
      if (exists.ok) return new Response('Forbidden (already exists)', { status: 403 })
    }

    // Create parent directories with MKCOL
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/')
      await fetch(`${base}/${dir}`, { method: 'MKCOL', headers: { Authorization: auth } })
    }

    const res = await fetch(`${base}/${path}`, {
      method: 'PUT',
      headers: { Authorization: auth },
      body: body ?? new Uint8Array(0),
    })

    return new Response(null, {
      status: res.ok ? 201 : res.status,
      headers: { 'Content-Length': res.headers.get('Content-Length') ?? '0' },
    })
  },

  delete: async (key: string): Promise<Response> => {
    const path = key2path(key)
    const res = await fetch(`${base}/${path}`, { method: 'DELETE', headers: { Authorization: auth } })

    if (!res.ok) return new Response('Not Found', { status: 404 })
    return new Response(null, { status: 204 })
  },
}
