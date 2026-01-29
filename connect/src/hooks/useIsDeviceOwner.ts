import { useRouteParams } from '.'
import { api } from '../api'
import { useAuth } from './useAuth'

let isOwner = false

export const getIsDeviceOwner = () => isOwner

export const useIsDeviceOwner = () => {
  const { provider, token } = useAuth()
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!token })
  const [user] = api.auth.me.useQuery({})

  // Konik for some reason always returns is_owner=false
  isOwner = provider === 'konik' || !!device?.is_owner || !!user?.superuser
  return isOwner
}
