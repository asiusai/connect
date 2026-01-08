import { env } from './env'

const mkvUrl = (key: string) => `${env.MKV_URL}/${key}`

export const mkv = {
  list: async (key: string, start?: string, limit?: string): Promise<string[]> => {
    let qs = 'list'
    if (start) qs += `&start=${start}`
    if (limit) qs += `&limit=${limit}`
    const res = await fetch(`${mkvUrl(key)}?${qs}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.keys ?? []
  },

  get: async (key: string, headers?: HeadersInit): Promise<Response> => {
    return fetch(mkvUrl(key), { headers, redirect: 'follow' })
  },

  put: async (key: string, body: ReadableStream<Uint8Array> | null, headers?: HeadersInit, overwrite = false): Promise<Response> => {
    if (overwrite) await fetch(mkvUrl(key), { method: 'DELETE' }).catch(() => {})

    return fetch(mkvUrl(key), {
      method: 'PUT',
      body,
      headers,
      // @ts-expect-error bun supports duplex
      duplex: 'half',
    })
  },

  delete: async (key: string): Promise<Response> => {
    return fetch(mkvUrl(key), { method: 'DELETE' })
  },
}
