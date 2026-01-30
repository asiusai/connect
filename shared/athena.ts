import { z } from 'zod'
import { getProviderInfo, Provider } from './provider'
import { AthenaError, Service } from './types'

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
export type UploadQueueItem = z.infer<typeof UploadQueueItem>

export const ATHENA_METHODS = {
  echo: {
    params: z.object({ s: z.string() }),
    result: z.string(),
  },
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
    result: z.object({ jpegFront: z.string().nullable(), jpegBack: z.string().nullable() }).or(z.null()),
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
      failed: z.string().array().optional(),
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
    params: z.object({ service: Service, timeout: z.number().optional() }),
    result: z.any(),
  },
  uploadFileToUrl: {
    params: z.object({
      fn: z.string(),
      url: z.string(),
      headers: z.record(z.string()),
    }),
    result: z.object({
      enqueued: z.number(),
      failed: z.string().array().optional(),
      items: UploadQueueItem.array(),
    }),
  },
  getVersion: {
    params: z.void(),
    result: z.object({
      version: z.string(),
      remote: z.string(),
      branch: z.string(),
      commit: z.string(),
    }),
  },
  listDataDirectory: {
    params: z.object({ prefix: z.string().optional() }),
    result: z.string().array(),
  },
  getPublicKey: {
    params: z.void(),
    result: z.string().nullable(),
  },
  getSshAuthorizedKeys: {
    params: z.void(),
    result: z.string(),
  },
  getGithubUsername: {
    params: z.void(),
    result: z.string(),
  },
  getSimInfo: {
    params: z.void(),
    result: z.object({
      sim_id: z.string().optional(),
      imei: z.string().optional(),
      network_type: z.number().optional(),
    }),
  },
  getNetworkType: {
    params: z.void(),
    result: z.number(),
  },
  getNetworks: {
    params: z.void(),
    result: z
      .object({
        type: z.number(),
        strength: z.number(),
        metered: z.boolean(),
      })
      .array(),
  },
  webrtc: {
    params: z.object({
      sdp: z.string(),
      cameras: z.string().array(),
      bridge_services_in: z.string().array(),
      bridge_services_out: z.string().array(),
    }),
    result: z.object({
      sdp: z.string(),
      type: z.string(),
    }),
  },
  startLocalProxy: {
    params: z.object({
      remote_ws_uri: z.string(),
      local_port: z.number(),
    }),
    result: z.object({ success: z.number() }),
  },
  getAllParams: {
    params: z.object({}),
    result: z.record(z.any()),
  },
  saveParams: {
    params: z.object({
      params_to_update: z.record(z.string().nullable()),
    }),
    result: z.record(z.string()),
  },
}

export type AthenaRequest = keyof typeof ATHENA_METHODS
export type AthenaParams<T extends AthenaRequest> = z.infer<(typeof ATHENA_METHODS)[T]['params']>
export type AthenaResult<T extends AthenaRequest> = z.infer<(typeof ATHENA_METHODS)[T]['result']>
export type AthenaResponse<T extends AthenaRequest> = { error?: AthenaError; result?: AthenaResult<T> }

export const fetchAthena = async <T extends AthenaRequest>({
  method,
  params,
  dongleId,
  expiry,
  token,
  provider,
}: {
  method: T
  params: AthenaParams<T>
  dongleId: string
  expiry?: number
  token: string | undefined
  provider: Provider
}): Promise<AthenaResponse<T> | undefined> => {
  const parse = ATHENA_METHODS[method].params.safeParse(params)
  if (!parse.success) console.error(parse.error)

  const providerInfo = getProviderInfo(provider)
  if (!token) return void console.error(`Athena called without token`)

  const res = await fetch(`${providerInfo.athenaUrl}/${dongleId}`, {
    method: 'POST',
    body: JSON.stringify({
      id: 0,
      jsonrpc: '2.0',
      method: method,
      params,
      expiry,
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
  })
  if (!res.ok) return

  if (res.status === 202) {
    console.warn(await res.text())
    return
  }

  if (res.status === 200)
    return z
      .object({
        error: AthenaError.optional(),
        result: ATHENA_METHODS[method].result.optional(),
      })
      .parse(await res.json())
}
