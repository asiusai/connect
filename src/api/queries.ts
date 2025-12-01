import { api } from '.'
import { env } from '../utils/env'
import { isSignedIn } from '../utils/helpers'

// TODO:
// wrapper
const w = <Res extends { data?: { status: number; body: any } }>(res: Res): [NonNullable<Res['data']>['body'] | undefined, Res] => {
  return [res.data?.body, res] as any
}

export const useDevice = (dongleId: string) =>
  w(api.devices.get.useQuery({ queryKey: ['device', dongleId], queryData: { params: { dongleId } } }))

export const useStats = (dongleId: string) =>
  w(api.devices.stats.useQuery({ queryKey: ['stats', dongleId], queryData: { params: { dongleId } } }))

export const useDeviceLocation = (dongleId: string) =>
  w(
    api.devices.location.useQuery({
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

export const useShareSignature = (routeName: string) =>
  w(
    api.routes.shareSignature.useQuery({
      queryKey: ['shareSignature', routeName],
      queryData: { params: { routeName } },
    }),
  )

export const useDevices = () => w(api.devices.devices.useQuery({ queryKey: ['devices'] }))
export const useProfile = () => w(api.profile.me.useQuery({ queryKey: ['me'], enabled: isSignedIn() }))

export const useRoute = (routeName: string) =>
  w(api.routes.get.useQuery({ queryKey: ['route', routeName], queryData: { params: { routeName } } }))

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

export const useFiles = (routeName: string, refetchInterval?: number) =>
  w(api.file.files.useQuery({ queryKey: ['files', routeName], queryData: { params: { routeName } }, refetchInterval }))

export const useUsers = (dongleId: string) =>
  w(api.devices.users.useQuery({ queryKey: ['users', dongleId], queryData: { params: { dongleId } } }))

export const useRendererStatus = () => w(api.renderer.status.useQuery({ queryKey: ['renderer-status'] }))

export const useRenderProgress = (renderId?: string) =>
  w(
    api.renderer.progress.useQuery({
      queryKey: ['render-progress', renderId],
      queryData: { query: { renderId: renderId! } },
      refetchInterval: 5_000,
      enabled: !!renderId,
    }),
  )
