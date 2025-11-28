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
} from '../types'
import { z } from 'zod'
import { ATHENA_URL, BILLING_URL, RENDERER_URL } from '../utils/consts'
import { AthenaRequest, AthenaResponse } from './athena'
import { PreviewProps } from '../../templates/Preview'

const c = initContract()

const profile = c.router({
  me: {
    method: 'GET',
    path: '/v1/me/',
    responses: {
      200: Profile,
    },
  },
})

const routes = c.router({
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
  allRoutes: {
    method: 'GET',
    path: '/v1/devices/:dongleId/routes',
    pathParams: z.object({ dongleId: z.string() }),
    query: z.object({ limit: z.number(), created_before: z.number().optional() }),
    responses: {
      200: Route.array(),
    },
  },
  segments: {
    method: 'GET',
    path: '/v1/devices/:dongleId/routes_segments',
    pathParams: z.object({ dongleId: z.string() }),
    query: z.object({ route_str: z.string() }),
    responses: { 200: RouteSegment.array() },
  },
})

const devices = c.router({
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
  devices: {
    method: 'GET',
    path: '/v1/me/devices/',
    responses: {
      200: Device.array(),
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
})

const athena = c.router({
  athena: {
    metadata: { baseUrl: ATHENA_URL },
    method: 'POST',
    path: '/:dongleId',
    pathParams: z.object({
      dongleId: z.string(),
    }),
    body: AthenaRequest,
    responses: {
      200: AthenaResponse,
    },
  },
})

const file = c.router({
  files: {
    method: 'GET',
    path: '/v1/route/:routeName/files',
    pathParams: z.object({ routeName: z.string() }),
    responses: {
      200: Files,
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
})

const prime = c.router({
  status: {
    metadata: { baseUrl: BILLING_URL },
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
    metadata: { baseUrl: BILLING_URL },
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
    metadata: { baseUrl: BILLING_URL },
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
    metadata: { baseUrl: BILLING_URL },
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
    metadata: { baseUrl: BILLING_URL },
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
    metadata: { baseUrl: BILLING_URL },
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

const renderer = c.router({
  status: {
    metadata: { baseUrl: RENDERER_URL },
    method: 'GET',
    path: '/v1/status',
    responses: {
      200: z.object({}),
    },
  },
  render: {
    metadata: { baseUrl: RENDERER_URL },
    method: 'POST',
    path: '/v1/render',
    body: z.object({
      props: PreviewProps,
      siteUrl: z.string(),
    }),
    responses: {
      200: z.object({
        renderId: z.string(),
      }),
    },
  },
  progress: {
    metadata: { baseUrl: RENDERER_URL },
    method: 'GET',
    path: '/v1/progress',
    query: z.object({
      renderId: z.string(),
    }),
    responses: {
      200: z.object({
        progress: z.number(),
      }),
    },
  },
})

const Err = z
  .object({ error: z.string() })
  .or(z.string())
  .transform((x) => (typeof x === 'string' ? x : x.error))

export const contract = c.router(
  {
    profile,
    routes,
    devices,
    athena,
    file,
    prime,
    renderer,
  },
  {
    commonResponses: {
      400: Err,
      401: Err,
      402: Err,
      403: Err,
      404: Err,
      500: Err,
    },
  },
)
