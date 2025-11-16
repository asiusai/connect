import { useParams } from 'react-router-dom'
import { api } from '.'

export const useDongleId = () => useParams().dongleId!

export const useDevice = (dongleId: string) =>
  api.devices.get.useQuery({ queryKey: ['device', dongleId], queryData: { params: { dongleId } } })

export const useStats = (dongleId: string) =>
  api.devices.stats.useQuery({ queryKey: ['stats', dongleId], queryData: { params: { dongleId } } })

export const useDeviceLocation = (dongleId: string) =>
  api.devices.location.useQuery({ queryKey: ['location', dongleId], queryData: { params: { dongleId } } })

export const usePreservedRoutes = (dongleId: string) =>
  api.routes.preserved.useQuery({ queryKey: ['preserved', dongleId], queryData: { params: { dongleId } } })

export const useRoutes = (dongleId: string, limit: number) =>
  api.routes.allRoutes.useQuery({
    queryKey: ['allRoutes', dongleId, limit],
    queryData: { params: { dongleId }, query: { limit } },
  })

export const useShareSignature = (routeName: string) => {
  return api.routes.shareSignature.useQuery({
    queryKey: ['shareSignature', routeName],
    queryData: { params: { routeName } },
  })
}

export const useDevices = () => api.devices.devices.useQuery({ queryKey: ['devices'] })
export const useProfile = () => api.profile.me.useQuery({ queryKey: ['me'] })

export const useRoute = (routeName: string) =>
  api.routes.get.useQuery({ queryKey: ['route', routeName], queryData: { params: { routeName } } })

export const useSubscribeInfo = (dongleId: string) =>
  api.prime.info.useQuery({ queryKey: ['subscribe-info', dongleId], queryData: { query: { dongle_id: dongleId } } })

export const useStripeSession = (dongleId: string, stripeSessionId: string) =>
  api.prime.getSession.useQuery({
    queryKey: ['session', dongleId, stripeSessionId],
    queryData: { query: { dongle_id: dongleId, session_id: stripeSessionId } },
    enabled: (x) => x.state.data?.body.payment_status !== 'paid',
    refetchInterval: 10_000,
  })

export const useSubscription = (dongleId: string) =>
  api.prime.status.useQuery({
    queryKey: ['subscription-status', dongleId],
    queryData: { query: { dongle_id: dongleId } },
    refetchInterval: 10_000,
  })

export const usePortal = (dongleId: string) =>
  api.prime.getPortal.useQuery({ queryKey: ['get-portal', dongleId], queryData: { query: { dongle_id: dongleId } } })
