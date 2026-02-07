import { $ } from 'bun'
import { env } from './env'

class WebDAV {
  private base: string
  private auth: string
  constructor(storageUrl: string) {
    const url = new URL(storageUrl)
    this.auth = `Basic ${Buffer.from(`${url.username}:${url.password}`).toString('base64')}`
    url.username = ''
    url.password = ''
    this.base = url.toString().replace(/\/$/, '')
  }
  private key2path = (key: string) => {
    const fsKey = `/${key}`
    const hash = new Bun.CryptoHasher('md5').update(fsKey).digest()
    const b64 = Buffer.from(fsKey).toString('base64')
    return `sv00/${hash[0].toString(16).padStart(2, '0')}/${hash[1].toString(16).padStart(2, '0')}/${b64}`
  }

  get = async (key: string, headers?: HeadersInit): Promise<Response> => {
    const path = this.key2path(key)
    const h = new Headers(headers)
    const range = h.get('Range')

    const res = await fetch(`${this.base}/${path}`, {
      headers: range ? { Authorization: this.auth, Range: range } : { Authorization: this.auth },
    })

    if (res.status === 404) return new Response('Not Found', { status: 404 })
    if (!res.ok) return new Response(res.statusText, { status: res.status })

    const resHeaders: HeadersInit = { 'Accept-Ranges': 'bytes' }
    const contentLength = res.headers.get('Content-Length')
    const contentRange = res.headers.get('Content-Range')
    if (contentLength) resHeaders['Content-Length'] = contentLength
    if (contentRange) resHeaders['Content-Range'] = contentRange

    return new Response(res.body, { status: res.status, headers: resHeaders })
  }

  head = async (key: string): Promise<Response> => {
    const path = this.key2path(key)
    const res = await fetch(`${this.base}/${path}`, { method: 'HEAD', headers: { Authorization: this.auth } })

    if (!res.ok) return new Response(null, { status: 404 })
    return new Response(null, {
      headers: { 'Content-Length': res.headers.get('Content-Length') ?? '0' },
    })
  }

  put = async (key: string, body: ReadableStream<Uint8Array> | Blob | null, _headers?: HeadersInit, overwrite = false): Promise<Response> => {
    const path = this.key2path(key)

    if (!overwrite) {
      const exists = await fetch(`${this.base}/${path}`, { method: 'HEAD', headers: { Authorization: this.auth } })
      if (exists.ok) return new Response('Forbidden (already exists)', { status: 403 })
    }

    // Create parent directories with MKCOL
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/')
      await fetch(`${this.base}/${dir}`, { method: 'MKCOL', headers: { Authorization: this.auth } })
    }

    const res = await fetch(`${this.base}/${path}`, {
      method: 'PUT',
      headers: { Authorization: this.auth },
      body: body ?? new Uint8Array(0),
    })

    return new Response(null, {
      status: res.ok ? 201 : res.status,
      headers: { 'Content-Length': res.headers.get('Content-Length') ?? '0' },
    })
  }

  delete = async (key: string): Promise<Response> => {
    const path = this.key2path(key)
    const res = await fetch(`${this.base}/${path}`, { method: 'DELETE', headers: { Authorization: this.auth } })

    if (!res.ok) return new Response('Not Found', { status: 404 })
    return new Response(null, { status: 204 })
  }
}

class BunStorage {
  constructor(private basePath: string) {
    $`mkdir -p ${basePath}`
  }

  private key2path = (key: string) => `${this.basePath}/${key}`

  get = async (key: string, headers?: HeadersInit): Promise<Response> => {
    const path = this.key2path(key)
    const file = Bun.file(path)
    if (!(await file.exists())) return new Response('Not Found', { status: 404 })

    const h = new Headers(headers)
    const range = h.get('Range')

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : file.size - 1
        const slice = file.slice(start, end + 1)
        return new Response(slice, {
          status: 206,
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(slice.size),
            'Content-Range': `bytes ${start}-${end}/${file.size}`,
          },
        })
      }
    }

    return new Response(file, {
      headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(file.size) },
    })
  }

  head = async (key: string): Promise<Response> => {
    const path = this.key2path(key)
    const file = Bun.file(path)
    if (!(await file.exists())) return new Response(null, { status: 404 })
    return new Response(null, { headers: { 'Content-Length': String(file.size) } })
  }

  put = async (key: string, body: ReadableStream<Uint8Array> | Blob | null, _headers?: HeadersInit, overwrite = false): Promise<Response> => {
    const path = this.key2path(key)
    const file = Bun.file(path)

    if (!overwrite && (await file.exists())) return new Response('Forbidden (already exists)', { status: 403 })

    const dir = path.substring(0, path.lastIndexOf('/'))
    await Bun.spawn(['mkdir', '-p', dir]).exited

    if (body instanceof ReadableStream) {
      const chunks: Uint8Array[] = []
      const reader = body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      await Bun.write(path, result)
    } else {
      await Bun.write(path, body ?? new Uint8Array(0))
    }
    const size = (await Bun.file(path).stat())?.size ?? 0

    return new Response(null, { status: 201, headers: { 'Content-Length': String(size) } })
  }

  delete = async (key: string): Promise<Response> => {
    const path = this.key2path(key)
    const file = Bun.file(path)
    if (!(await file.exists())) return new Response('Not Found', { status: 404 })

    await Bun.spawn(['rm', path]).exited
    return new Response(null, { status: 204 })
  }
}

export const fs = env.STORAGEBOX_URL ? new WebDAV(env.STORAGEBOX_URL) : new BunStorage(env.STORAGE_PATH)
