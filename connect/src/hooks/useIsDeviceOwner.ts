import { useRouteParams } from '.'
import { api } from '../api'
import { isSignedIn } from '../utils/helpers'
import { useStorage } from '../utils/storage'

let isOwner = false

export const getIsDeviceOwner = () => isOwner

export const useIsDeviceOwner = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: isSignedIn() })
  const [user] = api.auth.me.useQuery({})
  const provider = useStorage((x) => x.provider)

  // Konik for some reason always returns is_owner=false
  isOwner = provider === 'konik' || !!device?.is_owner || !!user?.superuser
  return isOwner
}
