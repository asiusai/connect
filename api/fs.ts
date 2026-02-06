import { mkdir, unlink } from 'fs/promises'
import { dirname } from 'path'
import { env } from './env'

const key2path = (key: string) => {
  const fsKey = `/${key}`
  const hash = new Bun.CryptoHasher('md5').update(fsKey).digest()
  const b64 = Buffer.from(fsKey).toString('base64')
  return `${env.VOLUME_PATH}/sv00/${hash[0].toString(16).padStart(2, '0')}/${hash[1].toString(16).padStart(2, '0')}/${b64}`
}

export const fs = {
  key2path,

  get: async (key: string, headers?: HeadersInit): Promise<Response> => {
    const path = key2path(key)
    const file = Bun.file(path)

    if (!(await file.exists())) return new Response('Not Found', { status: 404 })

    const h = new Headers(headers)
    const range = h.get('Range')

    if (range) {
      const fileSize = file.size
      const match = range.match(/bytes=(\d*)-(\d*)/)
      if (!match) return new Response('Bad Range', { status: 416 })

      const start = match[1] ? parseInt(match[1], 10) : 0
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

      if (start >= fileSize || end >= fileSize || start > end) {
        return new Response('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        })
      }

      return new Response(file.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(end - start + 1),
          'Accept-Ranges': 'bytes',
        },
      })
    }

    return new Response(file, {
      headers: {
        'Content-Length': String(file.size),
        'Accept-Ranges': 'bytes',
      },
    })
  },

  head: async (key: string): Promise<Response> => {
    const path = key2path(key)
    const file = Bun.file(path)

    if (!(await file.exists())) return new Response(null, { status: 404 })

    return new Response(null, {
      headers: { 'Content-Length': String(file.size) },
    })
  },

  put: async (key: string, body: ReadableStream<Uint8Array> | Blob | null, _headers?: HeadersInit, overwrite = false): Promise<Response> => {
    const path = key2path(key)
    const file = Bun.file(path)

    if (!overwrite && (await file.exists())) {
      return new Response('Forbidden (already exists)', { status: 403 })
    }

    await mkdir(dirname(path), { recursive: true })
    const data = body instanceof Blob ? body : body instanceof ReadableStream ? await new Response(body).arrayBuffer() : new Uint8Array(0)
    const written = await Bun.write(path, data)

    return new Response(null, {
      status: 201,
      headers: { 'Content-Length': String(written) },
    })
  },

  delete: async (key: string): Promise<Response> => {
    const path = key2path(key)
    try {
      await unlink(path)
      return new Response(null, { status: 204 })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  },
}
