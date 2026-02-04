import { useCallback, useEffect } from 'react'
import { useIsDeviceOwner } from '../useIsDeviceOwner'
import { AthenaParams, AthenaRequest, fetchAthena, TransportType } from '../../../../shared/athena'
import { useRouteParams } from '..'
import { useAuth } from '../useAuth'
import { create } from 'zustand'
import { ZustandType } from '../../../../shared/helpers'

export type AthenaStatus = 'disconnected' | 'connecting' | 'connected' | 'not-supported' | 'unauthorized'
export type UseAthenaType = ReturnType<typeof useAthena>

const athenaInit = {
  status: 'disconnected' as AthenaStatus,
  voltage: undefined as string | undefined,
  initialized: false,
}
const useAthenaState = create<ZustandType<typeof athenaInit>>((set) => ({ set, ...athenaInit }))

export const useAthena = () => {
  const { dongleId } = useRouteParams()
  const isOwner = useIsDeviceOwner()
  const { provider, token } = useAuth()
  const { status, voltage, set, initialized } = useAthenaState()

  const call = useCallback(
    <T extends AthenaRequest>(method: T, params: AthenaParams<T>) => fetchAthena({ method, params, dongleId, token, provider }),
    [dongleId, token, provider],
  )

  const init = useCallback(async () => {
    if (!isOwner) return set({ status: 'unauthorized' })

    set({ status: 'connecting', initialized: true })
    const res = await call('getMessage', { service: 'peripheralState', timeout: 5000 })
    if (!res) return

    set({ voltage: res.peripheralState.voltage, status: 'connected' })
    console.log(`Athena connected, voltage: ${res.peripheralState.voltage}`)
  }, [call, isOwner])

  const disconnect = useCallback(() => {
    set({ voltage: undefined, status: 'disconnected', initialized: false })
  }, [])

  useEffect(() => {
    if (!initialized) init()
  }, [])

  return { type: 'athena' as TransportType, status, voltage, call, init, connect: init, disconnect }
}
