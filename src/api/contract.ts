import { initContract } from '@ts-rest/core'
import {
  AthenaCallRequest,
  AthenaOfflineQueueResponse,
  BackendAthenaCallResponse,
  BackendAthenaCallResponseError,
  Device,
  DeviceLocation,
  DrivingStatistics,
  Files,
  Profile,
  Route,
  RouteShareSignature,
  SubscribeInfo,
  SubscriptionStatus,
  UploadFileMetadataResponse,
} from './types'
import { z } from 'zod'

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
      200: Route,
    },
  },
  unPreserve: {
    method: 'DELETE',
    path: '/v1/route/:routeName/preserve',
    pathParams: z.object({ routeName: z.string() }),
    responses: {
      200: Route,
    },
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
  athenaOfflineQueue: {
    method: 'GET',
    path: '/v1/devices/:dongleId/athena_offline_queue',
    pathParams: z.object({ dongleId: z.string() }),
    responses: {
      200: AthenaOfflineQueueResponse,
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
      200: z.any(),
    },
  },
})

const athena = c.router({
  athena: {
    method: 'POST',
    path: '/:dongleId',
    pathParams: z.object({
      dongleId: z.string(),
    }),
    body: AthenaCallRequest,
    responses: {
      200: BackendAthenaCallResponse.or(BackendAthenaCallResponseError),
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
      200: UploadFileMetadataResponse,
    },
  },
})

// with BILLING_URL
const prime = c.router({
  status: {
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
    method: 'POST',
    path: '/v1/prime/stripe_checkout',
    body: z.object({
      dongle_id: z.string(),
      sim_id: z.string(),
      plan: z.string(),
    }),
    responses: {
      200: z.object({
        url: z.string(),
      }),
    },
  },
  getPortal: {
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

export const contract = c.router(
  {
    profile,
    routes,
    devices,
    athena,
    file,
    prime,
  },
  {
    commonResponses: {
      400: z.string(),
      401: z.string(),
      402: z.string(),
      403: z.string(),
      404: z.string(),
      500: z.string(),
    },
  },
)
