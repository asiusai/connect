import { z } from 'zod'

export const Profile = z.object({
  email: z.string(),
  id: z.string(),
  regdate: z.number(),
  superuser: z.boolean(),
  user_id: z.string(),
})

export const DeviceLocation = z.object({
  lat: z.number(),
  lng: z.number(),
  time: z.number(),
  accuracy: z.number(),
  speed: z.number(),
  bearing: z.number(),
})

export const ApiDevice = z.object({
  dongle_id: z.string(),
  alias: z.string(),
  serial: z.string(),
  last_athena_ping: z.number(),
  ignore_uploads: z.boolean().nullable(),
  is_paired: z.boolean(),
  is_owner: z.boolean(),
  public_key: z.string(),
  prime: z.boolean(),
  prime_type: z.number(),
  trial_claimed: z.boolean(),
  device_type: z.string(),
  openpilot_version: z.string(),
  sim_id: z.string(),
  sim_type: z.number(),
  eligible_features: z.object({
    prime: z.boolean(),
    prime_data: z.boolean(),
    nav: z.boolean(),
  }),
})

export const Device = ApiDevice.extend({
  is_online: z.boolean(),
})

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
  end_time: z.string().nullable(),
  fullname: z.string(),
  git_branch: z.string().nullable(),
  git_commit: z.string().nullable(),
  git_dirty: z.boolean().nullable(),
  git_remote: z.string().nullable(),
  is_public: z.boolean(),
  distance: z.number().default(0),
  maxqlog: z.number(),
  platform: z.string().nullable(),
  procqlog: z.number(),
  start_lat: z.number().default(0),
  start_lng: z.number().default(0),
  start_time: z.string().nullable(),
  url: z.string(),
  user_id: z.string().nullable(),
  version: z.string().nullable(),
  vin: z.string().nullable(),
})

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

export const AthenaCallRequest = z.object({
  expiry: z.number().optional(),
  id: z.number(),
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.any(),
})
export const AthenaOfflineQueueItem = AthenaCallRequest.extend({
  expiry: z.number(),
})
export const AthenaOfflineQueueResponse = AthenaOfflineQueueItem.array()

export const AthenaCallResponse = z.object({
  queued: z.boolean(),
  error: z.string().optional(),
  result: z.any().optional(),
})

export const BackendAthenaCallResponse = z.object({
  id: z.string(),
  jsonrpc: z.literal('2.0'),
  result: z.any().or(z.string()),
})

export const BackendAthenaCallResponseError = z.object({
  error: z.string(),
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

export const SubscriptionStatus = z.object({
  amount: z.number(),
  cancel_at: z.number().nullable(),
  is_prime_sim: z.boolean(),
  next_charge_at: z.number(),
  plan: z.string(),
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
