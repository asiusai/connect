import { useRouteParams } from '.'
import { provider } from '../../../shared/provider'
import { api } from '../api'
import { isSignedIn } from '../utils/helpers'

let isOwner = false

export const getIsDeviceOwner = () => isOwner

export const useIsDeviceOwner = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: isSignedIn() })
  const [user] = api.auth.me.useQuery({})

  // Konik for some reason always returns is_owner=false
  isOwner = provider.MODE === 'konik' || !!device?.is_owner || !!user?.superuser
  return isOwner
}
