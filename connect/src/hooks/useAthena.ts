import { useRouteParams } from './index'
import { useCallback } from 'react'
import { useIsDeviceOwner } from './useIsDeviceOwner'
import { AthenaParams, AthenaRequest, callAthena } from '../../../shared/athena'
import { accessToken } from '../utils/helpers'

export const useAthena = () => {
  const { dongleId } = useRouteParams()
  const isOwner = useIsDeviceOwner()
  return useCallback(
    async <T extends AthenaRequest>(type: T, params: AthenaParams<T>, expiry?: number) => {
      return await callAthena({ type, params, dongleId, expiry, token: accessToken() })
    },
    [dongleId, isOwner],
  )
}
