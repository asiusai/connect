import { contract } from '../../connect/src/api/contract'
import { InternalServerError, NotFoundError, tsr, UnauthorizedError } from '../common'
import { dataMiddleware } from '../middleware'
import { mkv } from '../mkv'
import { processUploadedFile } from '../processing'

export const data = tsr.router(contract.data, {
  get: dataMiddleware(async ({ query, headers }, { key, responseHeaders }) => {
    if (query.list !== undefined) {
      const files = await mkv.list(key, query.start, query.limit)
      return { status: 200, body: new Blob([JSON.stringify(files)]) }
    }

    const res = await mkv.get(key, headers)
    if (res.status === 404) throw new NotFoundError('File not found')
    if (!res.ok) throw new InternalServerError('Failed to read file')

    for (const h of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Md5']) {
      const v = res.headers.get(h)
      if (v) responseHeaders.set(h, v)
    }

    return { status: res.status as 200 | 206, body: await res.blob() }
  }),
  put: dataMiddleware(async ({ headers }, { key, request, permission }) => {
    if (permission !== 'owner') throw new UnauthorizedError('User only has read access')

    const res = await mkv.put(key, request.body, headers)
    // 403 means file already exists in MKV - treat as success
    if (!res.ok && res.status !== 403) throw new InternalServerError('Failed to write file')

    // Process route metadata when qlog is uploaded
    // Key format: dongleId/routeId/segment/file
    const [dongleId, ...pathParts] = key.split('/')
    processUploadedFile(dongleId, pathParts.join('/')).catch(console.error)

    return { status: 201, body: undefined }
  }),
  delete: dataMiddleware(async (_, { key, permission }) => {
    if (permission !== 'owner') throw new UnauthorizedError('User only has read access')

    const res = await mkv.delete(key)
    if (!res.ok) throw new InternalServerError('Failed to delete file')

    return { status: 204, body: undefined }
  }),
})
