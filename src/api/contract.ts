import { initContract } from '@ts-rest/core'
import {
  Device,
  DeviceLocation,
  DrivingStatistics,
  Files,
  Profile,
  Route,
  RouteShareSignature,
  SubscribeInfo,
  SubscriptionStatus,
  RouteSegment,
  UploadFileMetadata,
  AthenaRequest,
  AthenaResponse,
  FileName,
} from '../types'
import { z } from 'zod'
import { env } from '../utils/env'

const c = initContract()

const files = c.router({
  events: {
    method: 'GET',
    path: '/connectdata/:dongleId/:routeStr/:segmentIndex/events.json',
    pathParams: z.object({
      dongleId: z.string(),
      routeStr: z.string(),
      segmentIndex: z.number(),
    }),
    responses: {
      200: z.any(),
    },
  },
  coords: {
    method: 'GET',
    path: '/connectdata/:dongleId/:routeStr/:segmentIndex/coords.json',
    pathParams: z.object({
      dongleId: z.string(),
      routeStr: z.string(),
      segmentIndex: z.number(),
    }),
    responses: {
      200: z.any(),
    },
  },
  sprite: {
    method: 'GET',
    path: '/connectdata/:dongleId/:routeStr/:segmentIndex/sprite.jpg',
    pathParams: z.object({
      dongleId: z.string(),
      routeStr: z.string(),
      segmentIndex: z.number(),
    }),
    responses: {
      // TODO: image
      200: z.any(),
    },
  },
  files: {
    method: 'GET',
    path: '/connectdata/:dongleId/:routeName/:segmentIndex/:fileName',
    pathParams: z.object({
      dongleId: z.string(),
      routeName: z.string(),
      segmentIndex: z.number(),
      fileName: FileName,
    }),
    responses: {
      200: z.any(),
    },
  },
})

const auth = c.router({
  me: {
    method: 'GET',
    path: '/v1/me/',
    responses: {
      200: Profile,
    },
  },
  auth: {
    method: 'POST',
    path: '/v2/auth/',
    body: z.object({ code: z.string(), provider: z.string() }),
    contentType: 'application/x-www-form-urlencoded',
    responses: {
      200: z.object({ access_token: z.string() }),
    },
  },
  googleRedirect: {
    method: 'GET',
    path: '/v2/auth/g/redirect/',
    query: z.object({ code: z.string(), state: z.string() }),
    responses: {
      200: z.any(),
    },
  },
  appleRedirect: {
    method: 'POST',
    path: '/v2/auth/a/redirect/',
    body: z.object({ code: z.string(), state: z.string() }),
    responses: {
      200: z.any(),
    },
  },
  githubRedirect: {
    method: 'GET',
    path: '/v2/auth/h/redirect/',
    query: z.object({ code: z.string(), state: z.string() }),
    responses: {
      200: z.any(),
    },
  },
})

const routes = c.router({
  allRoutes: {
    method: 'GET',
    path: '/v1/devices/:dongleId/routes',
    pathParams: z.object({ dongleId: z.string() }),
    query: z.object({ limit: z.number(), created_before: z.number().optional() }),
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
      start: z.number().optional(),
      end: z.number().optional(),
      limit: z.number().optional(),
    }),
    responses: { 200: RouteSegment.array() },
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
  get: {
    method: 'GET',
    path: '/v1/route/:routeName/',
    pathParams: z.object({
      routeName: z.string(),
    }),
    responses: {
      200: Route,
    },
  },
  shareSignature: {
    method: 'GET',
    path: '/v1/route/:routeName/share_signature',
    responses: {
      200: RouteShareSignature,
    },
  },
  setPublic: {
    method: 'PATCH',
    path: '/v1/route/:routeName/',
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
    pathParams: z.object({
      routeName: z.string(),
    }),
    body: z.any(),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },
  unPreserve: {
    method: 'DELETE',
    path: '/v1/route/:routeName/preserve',
    body: z.any(),
    pathParams: z.object({ routeName: z.string() }),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },
  files: {
    method: 'GET',
    path: '/v1/route/:routeName/files',
    pathParams: z.object({ routeName: z.string() }),
    responses: {
      200: Files,
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
    body: z.any(),
    responses: {
      200: z.object({ success: z.number() }),
    },
  },

  users: {
    method: 'GET',
    path: '/v1/devices/:dongleId/users',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: z
        .object({
          email: z.string(),
          permission: z.enum(['owner', 'read_access']),
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
      200: z.any(),
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
  pair: {
    method: 'POST',
    path: '/v2/pilotpair/',
    contentType: 'multipart/form-data',
    body: z.object({ pair_token: z.string() }),
    responses: {
      200: z.object({
        dongle_id: z.string(),
        first_pair: z.boolean(),
      }),
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

const device = c.router({
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
    body: z.any(),
    responses: {
      200: z.object({ dongle_id: z.string() }),
    },
  },
  getUploadUrl: {
    method: 'GET',
    path: '/v1.4/:dongleId/upload_url/',
    pathParams: z.object({ dongleId: z.string() }),
    query: z.object({
      path: z.string(),
      expiry_days: z.number().optional(),
    }),
    responses: {
      200: UploadFileMetadata,
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
    routes,
    devices,
    athena,
    prime,
    files,
    device,
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
