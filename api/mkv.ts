import { env } from './env'

const url = (key: string) => `${env.MKV_URL}/${key}`

export const mkv = {
  list: async (key: string, start?: string, limit?: string): Promise<string[]> => {
    let qs = 'list'
    if (start) qs += `&start=${start}`
    if (limit) qs += `&limit=${limit}`
    const res = await fetch(`${url(key)}?${qs}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.keys ?? []
  },

  get: async (key: string, headers?: HeadersInit): Promise<Response> => {
    return fetch(url(key), { headers, redirect: 'follow' })
  },

  put: async (key: string, body: ReadableStream<Uint8Array> | null, headers?: HeadersInit): Promise<Response> => {
    return fetch(url(key), {
      method: 'PUT',
      body,
      headers,
      // @ts-expect-error bun supports duplex
      duplex: 'half',
    })
  },

  delete: async (key: string): Promise<Response> => {
    return fetch(url(key), { method: 'DELETE' })
  },
}
