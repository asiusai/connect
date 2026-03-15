import { DeviceParams } from '../../utils/params'
import { useCallback, useEffect, useMemo } from 'react'
import { useAthena } from './useAthena'
import { AthenaParams, AthenaRequest } from '../../../../shared/athena'
import { toast } from 'sonner'
import { ZustandType } from '../../../../shared/helpers'
import { create } from 'zustand'
import { useNativeBle } from './useNativeBle'
import { useRouteParams } from '..'
import { isNative } from '../../capacitor'

const init = {
  params: undefined as Partial<DeviceParams> | undefined,
  dongleId: undefined as string | undefined,
}
const useDeviceState = create<ZustandType<typeof init>>((set) => ({ set, ...init }))

export const useDevice = () => {
  const { dongleId } = useRouteParams()
  const athena = useAthena()
  const ble = isNative
    ? useNativeBle()
    : {
        type: 'ble' as const,
        status: 'not-supported' as const,
        call: undefined,
        connected: false,
        voltage: undefined,
        init: async () => {},
        connect: async () => {},
        disconnect: async () => {},
      }
  const { params, set } = useDeviceState()

  const call2 = useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>) => {
      if (ble.call) return await ble.call(method, params)
      if (athena.call) return await athena.call(method, params)
      toast(`Can't call ${method}, device not connected`)
    },
    [athena.call, ble.call],
  )
  const call = useMemo(() => (athena.call || ble.call ? call2 : undefined), [call2, athena.call, ble.call])

  const saveParams = useCallback(
    async (changes: Partial<DeviceParams> = {}) => {
      if (!call) throw new Error('No call function')

      set((x) => ({ params: { ...x.params, ...changes } }))
      const result = await call('saveParams', { params_to_update: changes })

      const errors = Object.entries(result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) errors.forEach(([k, v]) => console.error(`${k}: ${v.replace('error: ', '')}`))

      return result
    },
    [call, set],
  )

  useEffect(() => {
    if (!call) return
    if (useDeviceState.getState().dongleId === dongleId) return
    set({ dongleId, params: undefined })

    call('getAllParams', {}).then((params) => {
      if (!params) throw new Error('getAllParams failed')
      const parsed = DeviceParams.partial().passthrough().safeParse(params)
      if (!parsed.success) console.warn(`Params parsing failed:`, parsed.error)
      set({ params })
    })
  }, [call, dongleId, set])

  return useMemo(
    () => ({
      params,
      call,
      saveParams: call ? saveParams : undefined,
      athena,
      ble,
      voltage: ble.voltage ?? athena.voltage,
      connected: ble.connected || athena.connected,
    }),
    [athena, ble, call, params, saveParams],
  )
}
