import { z } from 'zod'

export const Profile = z.object({
  email: z.string(),
  id: z.string(),
  regdate: z.number(),
  superuser: z.boolean(),
  user_id: z.string(),
})

export const DeviceLocation = z.object({
  dongle_id: z.string(),
  lat: z.number(),
  lng: z.number(),
  time: z.number(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  bearing: z.number().optional(),
})

const NAMES: Record<string, string> = {
  threex: 'comma 3X',
  neo: 'EON',
  freon: 'freon',
  unknown: 'unknown',
}
export const getDeviceName = (device: { device_type: string }) => NAMES[device.device_type] || `comma ${device.device_type}`
export const Device = z
  .object({
    alias: z.string().nullable(),
    athena_host: z.string().nullable(),
    device_type: z.string(),
    dongle_id: z.string(),
    eligible_features: z.object({
      prime: z.boolean(),
      prime_data: z.boolean(),
      nav: z.boolean().optional(),
    }),
    ignore_uploads: z.boolean().nullable(),
    is_paired: z.boolean(),
    is_owner: z.boolean(),
    last_athena_ping: z.number(),
    // ...
    openpilot_version: z.string().nullable(),
    prime: z.boolean(),
    prime_type: z.number(),
    public_key: z.string(),
    serial: z.string(),
    sim_id: z.string(),
    sim_type: z.number(),
    trial_claimed: z.boolean(),

    is_online: z.boolean().optional(),
    name: z.string().optional(),
  })
  .transform((x) => ({
    ...x,
    is_online: !!x.last_athena_ping && x.last_athena_ping >= Math.floor(Date.now() / 1000) - 120,
    name: x.name || x.alias || getDeviceName(x),
  }))

export const DrivingStatisticsAggregation = z.object({
  distance: z.number(),
  minutes: z.number(),
  routes: z.number(),
})

export const DrivingStatistics = z.object({
  all: DrivingStatisticsAggregation,
  week: DrivingStatisticsAggregation,
})

export const Route = z.object({
  create_time: z.number(),
  dongle_id: z.string(),
  end_lat: z.number().default(0),
  end_lng: z.number().default(0),
  end_time: z.string(),
  fullname: z.string(),
  git_branch: z.string(),
  git_commit: z.string(),
  git_commit_date: z.string().nullable(),
  git_dirty: z.boolean(),
  git_remote: z.string(),
  is_public: z.boolean(),
  distance: z.number().default(0),
  maxqlog: z.number(),
  platform: z.string(),
  procqlog: z.number(),
  start_lat: z.number().default(0),
  start_lng: z.number().default(0),
  start_time: z.string(),
  url: z.string(),
  user_id: z.string().nullable(),
  version: z.string(),
  vin: z.string(),
  make: z.string(),
  id: z.number(),
  car_id: z.number(),
  version_id: z.number(),
})

export const RouteSegment = Route.extend({
  end_time_utc_millis: z.number(),
  is_preserved: z.boolean(),
  segment_end_times: z.number().array(),
  segment_numbers: z.number().array(),
  segment_start_times: z.number().array(),
  share_exp: z.string(),
  share_sig: z.string(),
  start_time_utc_millis: z.number(),
}).strict()

export const RouteInfo = z.object({
  dongleId: z.string(),
  routeId: z.string(),
})

export const RouteShareSignature = z
  .object({
    exp: z.string(),
    sig: z.string(),
  })
  .catchall(z.string())

export const Files = z.object({
  cameras: z.string().array(),
  dcameras: z.string().array(),
  ecameras: z.string().array(),
  logs: z.string().array(),
  qcameras: z.string().array(),
  qlogs: z.string().array(),
})
export const DataFile = z.object({
  allow_cellular: z.boolean(),
  fn: z.string(),
  headers: z.record(z.string()),
  priority: z.number(),
  url: z.string(),
})

export const UploadFilesToUrlsRequest = z.object({
  files_data: DataFile.array(),
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

export const UploadFilesToUrlsResponse = z.object({
  enqueued: z.number(),
  failed: z.string().array(),
  items: UploadQueueItem.array(),
})

export const UploadFileMetadata = z.object({
  headers: z.record(z.string()),
  url: z.string(),
})

export const UploadFileMetadataResponse = UploadFileMetadata.array()

export const UploadFile = UploadFileMetadata.extend({
  filePath: z.string(),
})

export const CancelUploadRequest = z.object({
  upload_id: z.string().or(z.string().array()),
})

export const CancelUploadResponse = z.record(z.string(), z.number().or(z.string()))
export const PrimePlan = z.enum(['data', 'nodata'])
export const SubscriptionStatus = z.object({
  amount: z.number(),
  cancel_at: z.number().nullable(),
  is_prime_sim: z.boolean(),
  next_charge_at: z.number(),
  plan: PrimePlan.nullable(),
  requires_migration: z.boolean(),
  sim_id: z.string().nullable(),
  subscribed_at: z.number(),
  // trial_claim_end: z.number().nullable(),
  // trial_claimable: z.boolean(),
  trial_end: z.number(),
  user_id: z.string(),
})

export const SubscribeInfo = z.object({
  data_connected: z.boolean().nullable(),
  device_online: z.boolean(),
  has_prime: z.boolean(),
  is_prime_sim: z.boolean(),
  sim_id: z.string().nullable(),
  sim_type: z.string().nullable(),
  sim_usable: z.boolean().nullable(),
  trial_end_data: z.number().nullable(),
  trial_end_nodata: z.number().nullable(),
})

const AthenaRequestBase = z.object({
  id: z.literal(0),
  jsonrpc: z.literal('2.0'),
  expiry: z.number().optional(),
})
export const AthenaRequest = z.discriminatedUnion('method', [
  AthenaRequestBase.extend({ method: z.literal('getNetworkMetered') }),
  AthenaRequestBase.extend({ method: z.literal('setRouteViewed'), params: z.object({ route: z.string() }) }),
  AthenaRequestBase.extend({ method: z.literal('takeSnapshot') }),
  AthenaRequestBase.extend({ method: z.literal('listUploadQueue') }),
  AthenaRequestBase.extend({ method: z.literal('uploadFilesToUrls'), params: UploadFilesToUrlsRequest }),
  AthenaRequestBase.extend({ method: z.literal('cancelUpload'), params: CancelUploadRequest }),
])
export const AthenaOfflineQueueResponse = AthenaRequest.array()

export const AthenaResponse = z.object({
  queued: z.boolean().optional(),
  error: z.string().optional(),
  result: z
    .union([
      z.boolean(),
      z.object({ route: z.string() }),
      z.object({ jpegFront: z.string().optional(), jpegBack: z.string().optional() }),
      UploadQueueItem.array(),
      UploadFilesToUrlsResponse,
      CancelUploadResponse,
    ])
    .optional(),
})

export const BackendAthenaCallResponse = z.object({
  id: z.string(),
  jsonrpc: z.literal('2.0'),
  result: z.any().or(z.string()),
})

export const BackendAthenaCallResponseError = z.object({
  error: z.string(),
})

export const CameraType = z.enum(['road', 'wide', 'driver'])
export const RouteEventEvent = z.object({
  data: z.object({ event_type: z.string(), value: z.boolean().optional() }),
  offset_millis: z.number(),
  route_offset_millis: z.number(),
  time: z.number(),
  type: z.literal('event'),
})
export const RouteEventState = z.object({
  data: z.object({ state: z.string(), enabled: z.boolean(), alertStatus: z.number() }),
  offset_millis: z.number(),
  route_offset_millis: z.number(),
  time: z.number(),
  type: z.literal('state'),
})
export const RouteEvent = z.discriminatedUnion('type', [RouteEventEvent, RouteEventState])
export const Coord = z.object({
  t: z.number(),
  lat: z.number(),
  lng: z.number(),
  speed: z.number(),
  dist: z.number(),
})
// TYPES
export type Profile = z.infer<typeof Profile>
export type DeviceLocation = z.infer<typeof DeviceLocation>
export type Device = z.infer<typeof Device>
export type DrivingStatisticsAggregation = z.infer<typeof DrivingStatisticsAggregation>
export type DrivingStatistics = z.infer<typeof DrivingStatistics>
export type Route = z.infer<typeof Route>
export type RouteInfo = z.infer<typeof RouteInfo>
export type RouteShareSignature = z.infer<typeof RouteShareSignature>
export type Files = z.infer<typeof Files>
export type AthenaRequest = z.infer<typeof AthenaRequest>
export type AthenaOfflineQueueResponse = z.infer<typeof AthenaOfflineQueueResponse>
export type AthenaResponse = z.infer<typeof AthenaResponse>
export type BackendAthenaCallResponse = z.infer<typeof BackendAthenaCallResponse>
export type BackendAthenaCallResponseError = z.infer<typeof BackendAthenaCallResponseError>
export type DataFile = z.infer<typeof DataFile>
export type UploadFilesToUrlsRequest = z.infer<typeof UploadFilesToUrlsRequest>
export type UploadQueueItem = z.infer<typeof UploadQueueItem>
export type UploadFilesToUrlsResponse = z.infer<typeof UploadFilesToUrlsResponse>
export type UploadFileMetadata = z.infer<typeof UploadFileMetadata>
export type UploadFileMetadataResponse = z.infer<typeof UploadFileMetadataResponse>
export type UploadFile = z.infer<typeof UploadFile>
export type CancelUploadRequest = z.infer<typeof CancelUploadRequest>
export type CancelUploadResponse = z.infer<typeof CancelUploadResponse>
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>
export type SubscribeInfo = z.infer<typeof SubscribeInfo>
export type RouteSegment = z.infer<typeof RouteSegment>
export type PrimePlan = z.infer<typeof PrimePlan>
export type CameraType = z.infer<typeof CameraType>
export type Coord = z.infer<typeof Coord>
export type RouteEvent = z.infer<typeof RouteEvent>
