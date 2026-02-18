import { z } from 'zod'
import { ProviderInfo } from './provider'
import { AthenaError, Service } from './types'
import { Skill } from './skills'

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

export const TransportType = z.enum(['athena', 'ble'])
export type TransportType = z.infer<typeof TransportType>

const req = <Params, Result>(params: Params, result: Result, ...types: TransportType[]) => ({
  params,
  result,
  types: types.length ? types : (['athena', 'ble'] as const),
})

export const ATHENA_METHODS = {
  // Athena only
  setRouteViewed: req(z.object({ route: z.string() }), z.object({ success: z.number() }), 'athena'),
  listUploadQueue: req(z.void(), UploadQueueItem.array(), 'athena'),
  uploadFilesToUrls: req(
    z.object({ files_data: DataFile.array() }),
    z.object({
      enqueued: z.number(),
      failed: z.string().array().optional(),
      items: UploadQueueItem.array(),
    }),
    'athena',
  ),
  cancelUpload: req(z.object({ upload_id: z.string().or(z.string().array()) }), z.record(z.string(), z.number().or(z.string())), 'athena'),
  uploadFileToUrl: req(
    z.object({
      fn: z.string(),
      url: z.string(),
      headers: z.record(z.string()),
    }),
    z.object({
      enqueued: z.number(),
      failed: z.string().array().optional(),
      items: UploadQueueItem.array(),
    }),
    'athena',
  ),

  // All
  echo: req(z.object({ s: z.string() }), z.string()),
  getNetworkMetered: req(z.void(), z.boolean()),
  takeSnapshot: req(z.void(), z.object({ jpegFront: z.string().nullable(), jpegBack: z.string().nullable() }).or(z.null())),
  getMessage: req(z.object({ service: Service, timeout: z.number().optional() }), z.any()),

  getVersion: req(
    z.void(),
    z.object({
      version: z.string(),
      remote: z.string(),
      branch: z.string(),
      commit: z.string(),
    }),
  ),
  listDataDirectory: req(z.object({ prefix: z.string().optional() }), z.string().array()),
  getPublicKey: req(z.void(), z.string().nullable()),
  getSshAuthorizedKeys: req(z.void(), z.string()),
  getGithubUsername: req(z.void(), z.string()),
  getSimInfo: req(
    z.void(),
    z.object({
      sim_id: z.string().optional(),
      imei: z.string().optional(),
      network_type: z.number().optional(),
    }),
  ),
  getNetworks: req(z.void(), z.object({ type: z.number(), strength: z.number(), metered: z.boolean() }).array()),
  getNetworkType: req(z.void(), z.number()),
  webrtc: req(
    z.object({
      sdp: z.string(),
      cameras: z.string().array(),
      bridge_services_in: z.string().array(),
      bridge_services_out: z.string().array(),
    }),
    z.object({ sdp: z.string(), type: z.string() }),
  ),
  startLocalProxy: req(z.object({ remote_ws_uri: z.string(), local_port: z.number() }), z.object({ success: z.number() })),
  getAllParams: req(z.object({}), z.record(z.any())),
  saveParams: req(z.object({ params_to_update: z.record(z.any()) }), z.record(z.string())),

  // Skills
  getSkills: req(z.void(), z.record(Skill)),
  addSkill: req(Skill, z.object({ skill_id: z.string() })),
  removeSkill: req(z.object({ skill_id: z.string() }), z.object({ status: z.literal('ok') })),
  runSkill: req(z.object({ skill_id: z.string() }), z.object({ status: z.literal('ok'), skill: z.string() })),

  // BLE only
  getDeviceInfo: req(
    z.void(),
    z.object({
      serial: z.string(),
      agnos_version: z.string(),
      openpilot_installed: z.boolean(),
      ipc_connected: z.boolean(),
    }),
    'ble',
  ),
  getBleStatus: req(
    z.void(),
    z.object({
      bonded: z.boolean(),
      bonded_device: z.string().nullable(),
      connected: z.boolean(),
      enabled: z.boolean(),
      advertising: z.boolean(),
    }),
    'ble',
  ),
  bleUnpair: req(z.void(), z.object({ status: z.literal('ok') }), 'ble'),
  bleDisable: req(z.void(), z.object({ status: z.literal('disabled') }), 'ble'),
  bleEnable: req(z.void(), z.object({ status: z.literal('enabled') }), 'ble'),
  getWifiNetworks: req(
    z.void(),
    z
      .object({
        ssid: z.string(),
        strength: z.number(),
        security: z.string(),
        connected: z.boolean(),
      })
      .array(),
    'ble',
  ),
  connectWifi: req(z.object({ ssid: z.string(), password: z.string().optional() }), z.object({ status: z.string() }), 'ble'),
  forgetWifi: req(z.object({ ssid: z.string() }), z.object({ status: z.string() }), 'ble'),
  getSavedWifi: req(z.void(), z.string().array(), 'ble'),
  getNetworkStatus: req(
    z.void(),
    z.object({
      wifi_ssid: z.string(),
      wifi_ip: z.string(),
      wifi_connected: z.boolean(),
      has_internet: z.boolean(),
    }),
    'ble',
  ),
  installOpenpilot: req(
    z.object({ url: z.string().optional(), branch: z.string().optional() }),
    z.object({ status: z.string(), url: z.string(), branch: z.string() }),
    'ble',
  ),
  getInstallStatus: req(z.void(), z.object({ state: z.string(), progress: z.string(), error: z.string() }), 'ble'),
}

export type AthenaRequest = keyof typeof ATHENA_METHODS
export type AthenaParams<T extends AthenaRequest> = z.infer<(typeof ATHENA_METHODS)[T]['params']>
export type AthenaResult<T extends AthenaRequest> = z.infer<(typeof ATHENA_METHODS)[T]['result']>
export type AthenaResponse<T extends AthenaRequest> = AthenaResult<T>

export const fetchAthena = async <T extends AthenaRequest>({
  method,
  params,
  dongleId,
  expiry,
  token,
  providerInfo,
}: {
  method: T
  params: AthenaParams<T>
  dongleId: string
  expiry?: number
  token: string | undefined
  providerInfo: ProviderInfo
}): Promise<AthenaResponse<T> | undefined> => {
  const parse = ATHENA_METHODS[method].params.safeParse(params)
  if (!parse.success) console.error(parse.error)

  if (!token) return void console.error(`Athena called without token`)

  const res = await fetch(`${providerInfo.athenaUrl}/${dongleId}`, {
    method: 'POST',
    body: JSON.stringify({
      id: 0,
      jsonrpc: '2.0',
      method: method,
      params: parse.success ? parse.data : params,
      expiry,
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
  })
  if (!res.ok) return

  if (res.status === 202) return console.warn(await res.text())

  const parsed = z
    .object({
      error: AthenaError.optional(),
      result: ATHENA_METHODS[method].result.optional(),
    })
    .safeParse(await res.json())
  if (!parsed.success) return console.warn(`Parse failed: ${JSON.stringify(parsed.error)}`)
  if (parsed.data.error) return console.error(`Request failed with: ${JSON.stringify(parsed.data.error)}`)

  return parsed.data.result
}
