import { contract } from '../../connect/src/api/contract'
import { BadRequestError, NotFoundError, tsr, UnauthorizedError } from '../common'
import { env } from '../env'
import { dataMiddleware } from '../middleware'

const mkv = (path: string) => `http://localhost:${env.MKV_PORT}/${path}`

export const data = tsr.router(contract.data, {
  get: dataMiddleware(async ({ query, headers }, { key, responseHeaders }) => {
    // List mode
    if (query.list !== undefined) {
      let qs = 'list'
      if (query.start) qs += `&start=${query.start}`
      if (query.limit) qs += `&limit=${query.limit}`
      const res = await fetch(`${mkv(key)}?${qs}`)
      if (!res.ok) throw new NotFoundError()
      responseHeaders.set('Content-Type', 'application/json')
      return { status: 200, body: await res.blob() }
    }

    const res = await fetch(mkv(key), { headers, redirect: 'follow' })
    if (!res.ok) throw new NotFoundError()

    // Copy response headers
    for (const h of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Md5']) {
      const v = res.headers.get(h)
      if (v) responseHeaders.set(h, v)
    }

    const body = await res.blob()
    return { status: res.status as 200 | 206, body }
  }),
  put: dataMiddleware(async ({ headers }, { key, request, permission }) => {
    if (permission !== 'owner') throw new UnauthorizedError('User only has read access')

    const res = await fetch(mkv(key), {
      method: 'PUT',
      body: request.body,
      headers,
      // @ts-expect-error bun supports duplex
      duplex: 'half',
    })
    if (!res.ok) throw new BadRequestError(`MKV: ${res.status}`)
    return { status: 201, body: undefined }
  }),
  delete: dataMiddleware(async (_, { key, permission }) => {
    if (permission !== 'owner') throw new UnauthorizedError('User only has read access')

    const res = await fetch(mkv(key), { method: 'DELETE' })
    if (!res.ok) throw new NotFoundError()

    return { status: 204, body: undefined }
  }),
})
