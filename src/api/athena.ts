import { z } from 'zod'
import { api } from '.'
import { env } from '../utils/env'
import { AthenaError, Service } from '../types'

export const DataFile = z.object({
  allow_cellular: z.boolean(),
  fn: z.string(),
  headers: z.record(z.string()),
  priority: z.number(),
  url: z.string(),
})

export const UploadQueueItem = z.object({
  allow_cellular: z.boolean(),
  created_at: z.number(),
  current: z.boolean(),
  headers: z.record(z.string()),
  id: z.string(),
  path: z.string(),
  priority: z.number(),
  progress: z.number(),
  retry_count: z.number(),
  url: z.string(),
})

const REQUESTS = {
  getNetworkMetered: {
    params: z.void(),
    result: z.boolean(),
  },
  setRouteViewed: {
    params: z.object({ route: z.string() }),
    result: z.object({ success: z.number() }),
  },
  takeSnapshot: {
    params: z.void(),
    result: z.object({ jpegFront: z.string().optional(), jpegBack: z.string().optional() }),
  },
  listUploadQueue: {
    params: z.void(),
    result: UploadQueueItem.array(),
  },
  uploadFilesToUrls: {
    params: z.object({
      files_data: DataFile.array(),
    }),
    result: z.object({
      enqueued: z.number(),
      failed: z.string().array(),
      items: UploadQueueItem.array(),
    }),
  },
  cancelUpload: {
    params: z.object({
      upload_id: z.string().or(z.string().array()),
    }),
    result: z.record(z.string(), z.number().or(z.string())),
  },
  getMessage: {
    params: z.object({ service: Service, timeout: z.number() }),
    result: z.any(),
  },
}

export const callAthena = async <Type extends keyof typeof REQUESTS, Req extends (typeof REQUESTS)[Type]>({
  type,
  params,
  dongleId,
  expiry,
}: {
  type: Type
  params: z.infer<Req['params']>
  dongleId: string
  expiry?: number
}): Promise<{ error?: AthenaError; result?: z.infer<Req['result']> } | undefined> => {
  if (dongleId === env.DEMO_DONGLE_ID) return
  const req = REQUESTS[type]

  // Check params
  const res = await api.athena.athena.mutate({
    body: {
      id: 0,
      jsonrpc: '2.0',
      method: type,
      params: req.params.parse(params),
      expiry,
    },
    params: { dongleId },
  })
  if (res.status !== 200) return
  return z
    .object({
      error: AthenaError.optional(),
      result: req.result.optional(),
    })
    .parse(res.body)
}
