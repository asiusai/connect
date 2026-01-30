import { useRouteParams } from './index'
import { useCallback } from 'react'
import { useIsDeviceOwner } from './useIsDeviceOwner'
import { AthenaParams, AthenaRequest, fetchAthena } from '../../../shared/athena'
import { useAuth } from './useAuth'

export const useAthena = () => {
  const { dongleId } = useRouteParams()
  const isOwner = useIsDeviceOwner()
  const { provider, token } = useAuth()
  return useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>, expiry?: number) => {
      return await fetchAthena({ method, params, dongleId, expiry, token, provider })
    },
    [dongleId, isOwner],
  )
}
