import { env } from './env'

const mkvUrl = (key: string) => `${env.MKV_URL}/${key}`

export const mkv = {
  list: async (key: string, start?: string | null, limit?: string | null) => {
    let qs = 'list'
    if (start) qs += `&start=${start}`
    if (limit) qs += `&limit=${limit}`
    return await fetch(`${mkvUrl(key)}?${qs}`)
  },
  listKeys: async (key: string, start?: string | null, limit?: string | null): Promise<string[]> => {
    const res = await mkv.list(key, start, limit)
    return res.ok ? res.json().then((x) => x.keys) : []
  },

  get: async (key: string, headers?: HeadersInit): Promise<Response> => {
    return fetch(mkvUrl(key), { headers, redirect: 'follow' })
  },

  head: async (key: string, headers?: HeadersInit): Promise<Response> => {
    return fetch(mkvUrl(key), { method: 'HEAD', headers, redirect: 'follow' })
  },

  put: async (key: string, body: ReadableStream<Uint8Array> | null, headers?: HeadersInit, overwrite = false): Promise<Response> => {
    if (overwrite) await fetch(mkvUrl(key), { method: 'DELETE' }).catch(() => {})

    return fetch(mkvUrl(key), {
      method: 'PUT',
      body,
      headers,
      redirect: 'follow',
      // @ts-expect-error bun supports duplex
      duplex: 'half',
    })
  },

  delete: async (key: string): Promise<Response> => {
    return fetch(mkvUrl(key), { method: 'DELETE' })
  },
}
