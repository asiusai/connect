import { DeviceParamKey } from '../../utils/params'
import { useCallback, useEffect } from 'react'
import { useAthena } from './useAthena'
import { ATHENA_METHODS, AthenaParams, AthenaRequest } from '../../../../shared/athena'
import { toast } from 'sonner'
import { ZustandType } from '../../../../shared/helpers'
import { create } from 'zustand'
import { useBle } from './useBle'

type Changes = Partial<Record<DeviceParamKey, any>>

const init = {
  params: undefined as Changes | undefined,
  initialized: false,
}
const useDeviceState = create<ZustandType<typeof init>>((set) => ({ set, ...init }))

export const useDevice = () => {
  const athena = useAthena()
  const ble = useBle()
  const { params, set, initialized } = useDeviceState()

  const call = useCallback(
    async <T extends AthenaRequest>(method: T, params: AthenaParams<T>) => {
      const m = ATHENA_METHODS[method]
      if (!m.types) return

      if (m.types.includes('ble') && ble.status === 'connected') return await ble.call(method, params)
      else if (m.types.includes('athena') && athena.status === 'connected') return await athena.call(method, params)
      else toast(`Can't call ${method}, device not connnected`)
    },
    [athena, ble],
  )

  useEffect(() => {
    if (initialized) return
    if (athena.status !== 'connected' && ble.status !== 'connected') return
    set({ initialized: true })

    call('getAllParams', {}).then((params) => {
      if (!params) throw new Error('getAllParams failed')
      else set({ params })
    })
  }, [call, athena.status, ble.status])

  const saveParams = useCallback(
    async (changes: Changes = {}) => {
      set((x) => ({ params: { ...x.params, ...changes } }))
      const result = await call('saveParams', { params_to_update: changes })

      const errors = Object.entries(result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) errors.forEach(([k, v]) => console.error(`${k}: ${v.replace('error: ', '')}`))

      return result
    },
    [athena],
  )

  return { params, call, saveParams, athena, ble, voltage: ble.voltage ?? athena.voltage }
}
