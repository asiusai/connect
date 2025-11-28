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
  four: 'comma four',
  threex: 'comma 3X',
  neo: 'EON',
  freon: 'freon',
  unknown: 'unknown',
}
export const getCommaName = (device: { device_type: string }) => NAMES[device.device_type] || `comma ${device.device_type}`
export const Device = z.object({
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
})
export const isDeviceOnline = (device: Device) =>
  !!device.last_athena_ping && device.last_athena_ping >= Math.floor(Date.now() / 1000) - 120
export const getDeviceName = (device: Device) => device.alias || getCommaName(device)

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
  git_commit_date: z.string().nullable(),
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
  url: z.string().nullish(),
  user_id: z.string().nullable(),
  version: z.string().nullable(),
  vin: z.string().nullable(),
  make: z.string().nullable(),
  id: z.number().nullable(),
  car_id: z.number().nullable(),
  version_id: z.number().nullable(),
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

export const UploadFileMetadata = z.object({
  headers: z.record(z.string()),
  url: z.string(),
})

export const UploadFile = UploadFileMetadata.extend({
  filePath: z.string(),
})

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

export const CameraType = z.enum(['cameras', 'ecameras', 'dcameras', 'qcameras'])

export const LogType = z.enum(['qlogs', 'logs'])
export const FrameData = z.any()
export const PreviewData = z.object({
  route: Route,
  files: Files,
  logData: z.record(FrameData).array().optional(),
})
export const PreviewProps = z.object({
  routeName: z.string(),
  largeCamera: CameraType,
  smallCamera: CameraType.optional(),
  logType: LogType.optional(),
  data: PreviewData.optional(),
})
export type PreviewProps = z.infer<typeof PreviewProps>

export const AthenaRequest = z.object({
  id: z.literal(0),
  jsonrpc: z.literal('2.0'),
  expiry: z.number().optional(),
  method: z.string(),
  params: z.any(),
})
export const AthenaResponse = z.object({
  queued: z.boolean().optional(),
  error: z.string().optional(),
  result: z.any(),
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

export type UploadFileMetadata = z.infer<typeof UploadFileMetadata>
export type UploadFile = z.infer<typeof UploadFile>
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>
export type SubscribeInfo = z.infer<typeof SubscribeInfo>
export type RouteSegment = z.infer<typeof RouteSegment>
export type PrimePlan = z.infer<typeof PrimePlan>
export type Coord = z.infer<typeof Coord>
export type RouteEvent = z.infer<typeof RouteEvent>

export type CameraType = z.infer<typeof CameraType>
export type LogType = z.infer<typeof LogType>
export type PreviewData = z.infer<typeof PreviewData>
export type AthenaRequest = z.infer<typeof AthenaRequest>
export type AthenaResponse = z.infer<typeof AthenaResponse>
