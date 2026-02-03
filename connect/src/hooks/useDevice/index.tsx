import { DeviceParamKey } from '../../utils/params'
import { useAsyncEffect } from '..'
import { useCallback, useState } from 'react'
import { useAthena } from './useAthena'
import { ATHENA_METHODS, AthenaParams, AthenaRequest } from '../../../../shared/athena'
import { toast } from 'sonner'

type Changes = Partial<Record<DeviceParamKey, any>>

export const useDevice = () => {
  const [params, setParams] = useState<Changes>()
  const athena = useAthena()
  const ble = useAthena()

  const call = useCallback(
    <T extends AthenaRequest>(method: T, params: AthenaParams<T>) => {
      const m = ATHENA_METHODS[method]
      if (!m.types) return

      if (m.types.includes('ble') && ble.status === 'connected') return ble.call(method, params)
      else if (m.types.includes('athena') && athena.status === 'connected') return athena.call(method, params)
      else toast(`Can't call ${method}, device not connnected`)
    },
    [athena, ble],
  )

  useAsyncEffect(async () => {
    if (params) return
    if (athena.status !== 'connected' && ble.status !== 'connected') return

    const res = await call('getAllParams', {})
    if (!res) return console.error('Error:')
    setParams(res)
  }, [call, athena.status, ble.status])

  const saveParams = useCallback(
    async (changes: Changes = {}) => {
      setParams((x) => ({ ...x, ...changes }))
      const result = await call('saveParams', { params_to_update: changes })

      const errors = Object.entries(result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) errors.forEach(([k, v]) => console.error(`${k}: ${v.replace('error: ', '')}`))

      return result
    },
    [athena],
  )

  return { params, call, saveParams, athena, ble, voltage: ble.voltage ?? athena.voltage }
}
