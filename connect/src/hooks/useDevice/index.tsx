import { DeviceParams } from '../../utils/params'
import { useCallback, useEffect, useMemo } from 'react'
import { useAthena } from './useAthena'
import { ATHENA_METHODS, AthenaParams, AthenaRequest } from '../../../../shared/athena'
import { toast } from 'sonner'
import { ZustandType } from '../../../../shared/helpers'
import { create } from 'zustand'
import { useBle } from './useBle'
import { useRouteParams } from '..'

const init = {
  params: undefined as Partial<DeviceParams> | undefined,
  dongleId: undefined as string | undefined,
}
const useDeviceState = create<ZustandType<typeof init>>((set) => ({ set, ...init }))

export const useDevice = () => {
  const { dongleId } = useRouteParams()
  const athena = useAthena()
  const ble = useBle()
  const { params, set } = useDeviceState()

  const call2 = useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>) => {
      const m = ATHENA_METHODS[method]
      if (!m.types) return

      if (m.types.includes('ble') && ble.call) return await ble.call(method, params)
      else if (m.types.includes('athena') && athena.call) return await athena.call(method, params)
      else toast(`Can't call ${method}, device not connnected`)
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
