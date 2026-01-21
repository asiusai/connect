import { initContract } from '@ts-rest/core'
import {
  Device,
  DeviceLocation,
  DrivingStatistics,
  Files,
  User,
  Route,
  RouteShareSignature,
  SubscribeInfo,
  SubscriptionStatus,
  RouteSegment,
  UploadFileMetadata,
  AthenaRequest,
  AthenaResponse,
  Permission,
  DerivedFile,
} from './types'
import { z } from 'zod'
import { env } from './env'

const c = initContract()

const auth = c.router({
  me: {
    method: 'GET',
    path: '/v1/me/',
    responses: {
      200: User,
    },
  },
  auth: {
    method: 'POST',
    path: '/v2/auth/',
    body: z.object({ code: z.string(), provider: z.string() }),
    contentType: env.IS_OURS ? undefined : 'application/x-www-form-urlencoded',
    responses: {
      200: z.object({ access_token: z.string() }),
    },
  },
  googleRedirect: {
    method: 'GET',
    path: '/v2/auth/g/redirect/',
    query: z.object({ code: z.string(), state: z.string() }),
    responses: {
      302: c.noBody(),
    },
  },
  appleRedirect: {
    method: 'POST',
    path: '/v2/auth/a/redirect/',
    body: z.object({ code: z.string(), state: z.string() }),
    responses: {
      302: c.noBody(),
    },
  },
  githubRedirect: {
    method: 'GET',
    path: '/v2/auth/h/redirect/',
    query: z.object({ code: z.string(), state: z.string() }),
    responses: {
      302: c.noBody(),
    },
  },
})

const devices = c.router({
  devices: {
    method: 'GET',
    path: '/v1/me/devices/',
    responses: {
      200: Device.array(),
    },
  },
  pair: {
    method: 'POST',
    path: '/v2/pilotpair/',
    // TODO: check comma, maybe for comma it was supposed to be multipart/form-data, but this is needed for konik
    contentType: env.IS_OURS ? undefined : 'application/x-www-form-urlencoded',
    body: z.object({ pair_token: z.string() }),
    responses: {
      200: z.object({
        dongle_id: z.string(),
        first_pair: z.boolean(),
      }),
    },
  },
  register: {
    method: 'POST',
    path: '/v2/pilotauth/',
    query: z.object({
      imei: z.string(),
      imei2: z.string(),
      serial: z.string(),
      public_key: z.string(),
      register_token: z.string(),
    }),
    body: c.noBody(),
    responses: {
      200: z.object({ dongle_id: z.string() }),
    },
  },
})

const device = c.router({
  get: {
    method: 'GET',
    path: '/v1.1/devices/:dongleId/',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: Device,
    },
  },
  set: {
    method: 'PATCH',
    path: '/v1/devices/:dongleId/',
    pathParams: z.object({ dongleId: z.string() }),
    body: z.object({
      alias: z.string(),
    }),
    responses: {
      200: Device,
    },
  },
  athenaOfflineQueue: {
    method: 'GET',
    path: '/v1/devices/:dongleId/athena_offline_queue',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: AthenaRequest.array(),
    },
  },
  location: {
    method: 'GET',
    path: '/v1/devices/:dongleId/location',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: DeviceLocation,
    },
  },
  stats: {
    method: 'GET',
    path: '/v1.1/devices/:dongleId/stats',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: DrivingStatistics,
    },
  },
  unpair: {
    method: 'POST',
    path: '/v1/devices/:dongleId/unpair',
    pathParams: z.object({ dongleId: z.string() }),
    body: c.noBody(),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },
  bootlogs: {
    method: 'GET',
    path: '/v1/devices/:dongleId/bootlogs',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: z.string().array(),
    },
  },
  crashlogs: {
    method: 'GET',
    path: '/v1/devices/:dongleId/crashlogs',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: z.string().array(),
    },
  },
  firehoseStats: {
    method: 'GET',
    path: '/v1/devices/:dongleId/firehose_stats',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: z.object({ firehose: z.number() }),
    },
  },
  uploadFiles: {
    method: 'POST',
    path: '/v1/:dongleId/upload_urls/',
    pathParams: z.object({ dongleId: z.string() }),
    body: z.object({
      expiry_days: z.number(),
      paths: z.string().array(),
    }),
    responses: {
      200: UploadFileMetadata.array(),
    },
  },
  getUploadUrl: {
    method: 'GET',
    path: '/v1.4/:dongleId/upload_url/',
    pathParams: z.object({ dongleId: z.string() }),
    query: z.object({
      path: z.string(),
      expiry_days: z.coerce.number().optional(),
    }),
    responses: {
      200: UploadFileMetadata,
    },
  },
})

const routes = c.router({
  allRoutes: {
    method: 'GET',
    path: '/v1/devices/:dongleId/routes',
    pathParams: z.object({ dongleId: z.string() }),
    query: z.object({ limit: z.coerce.number().optional(), created_before: z.coerce.number().optional() }),
    responses: {
      200: Route.array(),
    },
  },
  preserved: {
    method: 'GET',
    path: '/v1/devices/:dongleId/routes/preserved',
    pathParams: z.object({
      dongleId: z.string(),
    }),
    responses: {
      200: Route.array(),
    },
  },
  routesSegments: {
    method: 'GET',
    path: '/v1/devices/:dongleId/routes_segments',
    pathParams: z.object({ dongleId: z.string() }),
    query: z.object({
      route_str: z.string().optional(),
      start: z.coerce.number().optional(),
      end: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
    responses: { 200: RouteSegment.array() },
  },
})

const routeQuery = z.object({ sig: z.string().optional() })

const route = c.router({
  get: {
    method: 'GET',
    path: '/v1/route/:routeName/',
    pathParams: z.object({ routeName: z.string() }),
    query: routeQuery,
    responses: {
      200: Route,
    },
  },
  derived: {
    method: 'GET',
    path: '/v1/route/:routeName/derived/:sig/:segment/:file',
    pathParams: z.object({ routeName: z.string(), sig: z.string(), segment: z.string(), file: DerivedFile }),
    responses: {
      302: c.noBody(),
    },
  },
  shareSignature: {
    method: 'GET',
    path: '/v1/route/:routeName/share_signature',
    pathParams: z.object({ routeName: z.string() }),
    query: routeQuery,
    responses: {
      200: RouteShareSignature,
    },
  },
  setPublic: {
    method: 'PATCH',
    path: '/v1/route/:routeName/',
    pathParams: z.object({ routeName: z.string() }),
    query: routeQuery,
    body: z.object({
      is_public: z.boolean(),
    }),
    responses: {
      200: Route,
    },
  },

  preserve: {
    method: 'POST',
    path: '/v1/route/:routeName/preserve',
    pathParams: z.object({ routeName: z.string() }),
    query: routeQuery,
    body: c.noBody(),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },
  unPreserve: {
    method: 'DELETE',
    path: '/v1/route/:routeName/preserve',
    pathParams: z.object({ routeName: z.string() }),
    query: routeQuery,
    body: c.noBody(),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },
  files: {
    method: 'GET',
    path: '/v1/route/:routeName/files',
    pathParams: z.object({ routeName: z.string() }),
    query: routeQuery,
    responses: {
      200: Files,
    },
  },
})

const users = c.router({
  get: {
    method: 'GET',
    path: '/v1/devices/:dongleId/users',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: z
        .object({
          email: z.string(),
          permission: Permission,
        })
        .array(),
    },
  },
  addUser: {
    method: 'POST',
    path: '/v1/devices/:dongleId/add_user',
    pathParams: z.object({ dongleId: z.string() }),
    body: z.object({ email: z.string() }),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },
  deleteUser: {
    method: 'POST',
    path: '/v1/devices/:dongleId/del_user',
    pathParams: z.object({ dongleId: z.string() }),
    body: z.object({ email: z.string() }),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },
})

const athena = c.router({
  athena: {
    metadata: { baseUrl: env.ATHENA_URL },
    method: 'POST',
    path: '/:dongleId',
    pathParams: z.object({
      dongleId: z.string(),
    }),
    body: AthenaRequest,
    responses: {
      200: AthenaResponse,
      202: AthenaResponse.extend({ result: z.string() }),
    },
  },
})

const prime = c.router({
  status: {
    metadata: { baseUrl: env.BILLING_URL },
    method: 'GET',
    path: '/v1/prime/subscription',
    query: z.object({
      dongle_id: z.string(),
    }),
    responses: {
      200: SubscriptionStatus,
    },
  },
  info: {
    metadata: { baseUrl: env.BILLING_URL },
    method: 'GET',
    path: '/v1/prime/subscribe_info',
    query: z.object({
      dongle_id: z.string(),
    }),
    responses: {
      200: SubscribeInfo,
    },
  },
  cancel: {
    metadata: { baseUrl: env.BILLING_URL },
    method: 'POST',
    path: '/v1/prime/cancel',
    body: z.object({
      dongle_id: z.string(),
    }),
    responses: {
      200: z.object({
        success: z.literal(1),
      }),
    },
  },
  getCheckout: {
    metadata: { baseUrl: env.BILLING_URL },
    method: 'POST',
    path: '/v1/prime/stripe_checkout',
    body: z.object({
      dongle_id: z.string(),
      sim_id: z.string(),
      plan: z.string().optional(),
    }),
    responses: {
      200: z.object({
        url: z.string(),
      }),
    },
  },
  getPortal: {
    metadata: { baseUrl: env.BILLING_URL },
    method: 'GET',
    path: '/v1/prime/stripe_portal',
    query: z.object({
      dongle_id: z.string(),
    }),
    responses: {
      200: z.object({ url: z.string() }),
    },
  },
  getSession: {
    metadata: { baseUrl: env.BILLING_URL },
    method: 'GET',
    path: '/v1/prime/stripe_session',
    query: z.object({
      dongle_id: z.string(),
      session_id: z.string(),
    }),
    responses: {
      200: z.object({
        payment_status: z.enum(['no_payment_required', 'paid', 'unpaid']),
      }),
    },
  },
})

const ServiceStatus = z.object({
  status: z.enum(['ok', 'error', 'pending']),
  latency: z.number().optional(),
  error: z.string().optional(),
})

const AdminUser = z.object({
  id: z.string(),
  email: z.string(),
  regdate: z.number(),
  superuser: z.boolean(),
  user_id: z.string(),
  username: z.string().nullable(),
  deviceCount: z.number(),
  totalSize: z.number(),
})

const AdminDevice = z.object({
  dongle_id: z.string(),
  alias: z.string().nullable(),
  device_type: z.string().nullable(),
  serial: z.string(),
  create_time: z.number(),
  ownerEmail: z.string().nullable(),
  fileCount: z.number(),
  totalSize: z.number(),
})

const AdminFile = z.object({
  key: z.string(),
  dongle_id: z.string(),
  route_id: z.string().nullable(),
  segment: z.number().nullable(),
  file: z.string(),
  size: z.number(),
  processingStatus: z.enum(['queued', 'processing', 'done', 'error']),
  processingError: z.string().nullable(),
  create_time: z.number(),
  sig: z.string(),
})

const AdminRoute = z.object({
  dongle_id: z.string(),
  route_id: z.string(),
  segmentCount: z.number(),
  fileCount: z.number(),
  totalSize: z.number(),
  start_time: z.number().nullable(),
  end_time: z.number().nullable(),
  platform: z.string().nullable(),
  version: z.string().nullable(),
  create_time: z.number(),
})

const AdminSegment = z.object({
  dongle_id: z.string(),
  route_id: z.string(),
  segment: z.number(),
  start_time: z.number().nullable(),
  end_time: z.number().nullable(),
  distance: z.number().nullable(),
  create_time: z.number(),
})

const admin = c.router({
  health: {
    method: 'GET',
    path: '/health',
    responses: {
      200: z.object({ status: z.literal('ok') }),
    },
  },
  status: {
    method: 'GET',
    path: '/status',
    responses: {
      200: z.object({
        status: z.enum(['ok', 'degraded']),
        uptime: z.number(),
        uptimeHistory: z.array(z.object({ timestamp: z.number() })),
        services: z.object({
          mkv: ServiceStatus,
          database: ServiceStatus,
        }),
        stats: z.object({
          users: z.number(),
          devices: z.number(),
          routes: z.number(),
          segments: z.number(),
          queue: z.record(z.string(), z.number()),
          totalSize: z.number(),
        }),
        frontends: z.array(ServiceStatus.extend({ name: z.string() })),
        ci: z.array(ServiceStatus.extend({ name: z.string() })),
        lastBackup: z.number().nullable(),
      }),
    },
  },
  users: {
    method: 'GET',
    path: '/admin/users',
    query: z.object({
      limit: z.coerce.number().optional(),
      offset: z.coerce.number().optional(),
    }),
    responses: {
      200: z.object({
        users: AdminUser.array(),
        total: z.number(),
      }),
    },
  },
  devices: {
    method: 'GET',
    path: '/admin/devices',
    query: z.object({
      user_id: z.string().optional(),
      limit: z.coerce.number().optional(),
      offset: z.coerce.number().optional(),
    }),
    responses: {
      200: z.object({
        devices: AdminDevice.array(),
        total: z.number(),
      }),
    },
  },
  files: {
    method: 'GET',
    path: '/admin/files',
    query: z.object({
      limit: z.coerce.number().optional(),
      offset: z.coerce.number().optional(),
      status: z.enum(['queued', 'processing', 'done', 'error']).optional(),
      dongle_id: z.string().optional(),
      route_id: z.string().optional(),
      sort: z.enum(['create_time', 'size']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
    responses: {
      200: z.object({
        files: AdminFile.array(),
        total: z.number(),
      }),
    },
  },
  routes: {
    method: 'GET',
    path: '/admin/routes',
    query: z.object({
      limit: z.coerce.number().optional(),
      offset: z.coerce.number().optional(),
      dongle_id: z.string().optional(),
      sort: z.enum(['create_time', 'size']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
    responses: {
      200: z.object({
        routes: AdminRoute.array(),
        total: z.number(),
      }),
    },
  },
  segments: {
    method: 'GET',
    path: '/admin/segments',
    query: z.object({
      limit: z.coerce.number().optional(),
      offset: z.coerce.number().optional(),
      dongle_id: z.string().optional(),
      route_id: z.string().optional(),
      sort: z.enum(['create_time', 'start_time', 'distance']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
    responses: {
      200: z.object({
        segments: AdminSegment.array(),
        total: z.number(),
      }),
    },
  },
  deleteFile: {
    method: 'DELETE',
    path: '/admin/files/:key',
    pathParams: z.object({
      key: z.string(),
    }),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
  },
  updateFileStatus: {
    method: 'PATCH',
    path: '/admin/files/:key',
    pathParams: z.object({
      key: z.string(),
    }),
    body: z.object({
      status: z.enum(['queued', 'processing', 'done', 'error']),
    }),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
  },
  deleteDevice: {
    method: 'DELETE',
    path: '/admin/devices/:dongleId',
    pathParams: z.object({
      dongleId: z.string(),
    }),
    responses: {
      200: z.object({ success: z.boolean(), deletedFiles: z.number() }),
    },
  },
})

const data = c.router({
  get: {
    method: 'GET',
    path: '/connectdata/:_key*',
    pathParams: z.object({
      _key: z.string(),
    }),
    query: z.object({
      list: z.string().optional(),
      start: z.string().optional(),
      limit: z.string().optional(),
      sig: z.string().optional(),
    }),
    headers: z.object({
      Range: z.string().optional(),
    }),
    responses: {
      200: c.otherResponse({ contentType: '*', body: c.type<Blob>() }),
      206: c.otherResponse({ contentType: '*', body: c.type<Blob>() }),
    },
  },
  put: {
    method: 'PUT',
    path: '/connectdata/:_key*',
    pathParams: z.object({
      _key: z.string(),
    }),
    query: z.object({
      sig: z.string().optional(),
    }),
    headers: z.object({
      'Content-Length': z.string().optional(),
    }),
    body: c.type<ReadableStream | Blob | ArrayBuffer>(),
    responses: {
      201: c.noBody(),
    },
  },
  delete: {
    method: 'DELETE',
    path: '/connectdata/:_key*',
    pathParams: z.object({
      _key: z.string(),
    }),
    query: z.object({
      sig: z.string().optional(),
    }),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
    },
  },
})

const Err = z
  .object({ error: z.string() })
  .or(z.string())
  .transform((x) => (typeof x === 'string' ? x : x.error))

export const contract = c.router(
  {
    auth,
    devices,
    device,
    routes,
    route,
    users,
    athena,
    prime,
    data,
    admin,
  },
  {
    commonResponses: {
      400: Err,
      401: Err,
      402: Err,
      403: Err,
      404: Err,
      500: Err,
      501: Err,
    },
  },
)
