import { useMemo } from 'react'
import { api } from '.'
import { env } from '../utils/env'
import { isSignedIn, toSegmentFiles } from '../utils/helpers'
import { Route } from '../types'

const w = <Res extends { data?: { status: number; body: any } }>(res: Res): [NonNullable<Res['data']>['body'] | undefined, Res] => {
  return [res.data?.body, res] as any
}

export const useDevice = (dongleId: string) =>
  w(api.device.get.useQuery({ queryKey: ['device', dongleId], queryData: { params: { dongleId } }, enabled: !!dongleId }))

export const useStats = (dongleId: string) => w(api.device.stats.useQuery({ queryKey: ['stats', dongleId], queryData: { params: { dongleId } } }))

export const useDeviceLocation = (dongleId: string) =>
  w(
    api.device.location.useQuery({
      queryKey: ['location', dongleId],
      queryData: { params: { dongleId } },
      enabled: dongleId !== env.DEMO_DONGLE_ID,
    }),
  )

export const usePreservedRoutes = (dongleId: string, enabled?: boolean) =>
  w(api.routes.preserved.useQuery({ queryKey: ['preserved', dongleId], queryData: { params: { dongleId } }, enabled }))

export const useRoutes = (dongleId: string, limit: number) =>
  w(
    api.routes.allRoutes.useQuery({
      queryKey: ['allRoutes', dongleId, limit],
      queryData: { params: { dongleId }, query: { limit } },
    }),
  )
export const useRoutesSegments = (dongleId: string, query: { start?: number; end?: number; limit?: number; route_str?: string }) =>
  w(
    api.routes.routesSegments.useQuery({
      queryKey: ['allRoutes', dongleId, query],
      queryData: { params: { dongleId }, query },
    }),
  )

export const useShareSignature = (routeName: string) =>
  w(
    api.route.shareSignature.useQuery({
      queryKey: ['shareSignature', routeName],
      queryData: { params: { routeName: routeName.replace('/', '|') } },
    }),
  )

export const useDevices = () => w(api.devices.devices.useQuery({ queryKey: ['devices'] }))
export const useProfile = () => w(api.auth.me.useQuery({ queryKey: ['me'], enabled: isSignedIn() }))

export const useRoute = (routeName: string) =>
  w(
    api.route.get.useQuery({
      queryKey: ['route', routeName],
      queryData: { params: { routeName: routeName.replace('/', '|') } },
    }),
  )

export const useSubscribeInfo = (dongleId: string) =>
  w(api.prime.info.useQuery({ queryKey: ['subscribe-info', dongleId], queryData: { query: { dongle_id: dongleId } } }))

export const useStripeSession = (dongleId: string, stripeSessionId: string) =>
  w(
    api.prime.getSession.useQuery({
      queryKey: ['session', dongleId, stripeSessionId],
      queryData: { query: { dongle_id: dongleId, session_id: stripeSessionId } },
      enabled: (x) => x.state.data?.body.payment_status !== 'paid' && !!stripeSessionId,
      refetchInterval: 10_000,
    }),
  )

export const useSubscription = (dongleId: string) =>
  w(
    api.prime.status.useQuery({
      queryKey: ['subscription-status', dongleId],
      queryData: { query: { dongle_id: dongleId } },
      refetchInterval: 10_000,
    }),
  )

export const usePortal = (dongleId: string) =>
  w(api.prime.getPortal.useQuery({ queryKey: ['get-portal', dongleId], queryData: { query: { dongle_id: dongleId } } }))

export const useFiles = (routeName: string, route: Route | undefined, refetchInterval?: number) => {
  const [files, res] = w(
    api.route.files.useQuery({
      queryKey: ['files', routeName],
      queryData: { params: { routeName: routeName.replace('/', '|') } },
      refetchInterval,
    }),
  )
  const files2 = useMemo(() => (files ? toSegmentFiles(files, route ? route.maxqlog + 1 : undefined) : undefined), [files])
  return [files2, res] as const
}

export const useUsers = (dongleId: string) => w(api.users.get.useQuery({ queryKey: ['users', dongleId], queryData: { params: { dongleId } } }))

export const useLocation = (dongleId: string) => w(api.device.location.useQuery({ queryKey: ['location', dongleId], queryData: { params: { dongleId } } }))

export const useAdminUsers = () => w(api.admin.users.useQuery({ queryKey: ['admin-users'] }))

export const useAdminDevices = (query: { user_id?: string }) =>
  w(api.admin.devices.useQuery({ queryKey: ['admin-devices', query], queryData: { query } }))

export const useAdminFiles = (query: {
  limit?: number
  offset?: number
  status?: 'queued' | 'processing' | 'done' | 'error'
  dongle_id?: string
  route_id?: string
  sort?: 'create_time' | 'size'
  order?: 'asc' | 'desc'
}) => w(api.admin.files.useQuery({ queryKey: ['admin-files', query], queryData: { query } }))

export const useAdminRoutes = (query: {
  limit?: number
  offset?: number
  dongle_id?: string
  sort?: 'create_time' | 'size'
  order?: 'asc' | 'desc'
}) => w(api.admin.routes.useQuery({ queryKey: ['admin-routes', query], queryData: { query } }))
