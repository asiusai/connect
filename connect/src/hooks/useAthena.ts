import { useRouteParams } from './index'
import { useCallback } from 'react'
import { useIsDeviceOwner } from './useIsDeviceOwner'
import { AthenaParams, AthenaRequest, callAthena } from '../../../shared/athena'
import { useAuth } from './useAuth'

export const useAthena = () => {
  const { dongleId } = useRouteParams()
  const isOwner = useIsDeviceOwner()
  const { provider, token } = useAuth()
  return useCallback(
    async <T extends AthenaRequest>(type: T, params: AthenaParams<T>, expiry?: number) => {
      return await callAthena({ type, params, dongleId, expiry, token, provider })
    },
    [dongleId, isOwner],
  )
}
