import { create } from 'zustand'
import { ZustandType } from '../../../shared/helpers'
import { DeviceParamKey } from '../utils/params'
import { useAsyncEffect } from '.'
import { useCallback } from 'react'
import { useIsDeviceOwner } from './useIsDeviceOwner'
import { useAthena } from './useAthena'

type Changes = Partial<Record<DeviceParamKey, any>>

const init = {
  initialized: false,
  saved: {} as Changes,
  isLoading: false,
  isError: false,
  isSaving: false,
}

const useDeviceParamsStore = create<ZustandType<typeof init>>((set) => ({ ...init, set }))

export const useDevice = () => {
  const { isLoading, isError, isSaving, set, saved, initialized } = useDeviceParamsStore()
  const athena = useAthena()
  const isOwner = useIsDeviceOwner()

  useAsyncEffect(async () => {
    if (!isOwner) return
    if (initialized) return
    set({ isLoading: true, isError: false, initialized: true })

    const res = await athena('getAllParams', {})
    if (res?.error || !res?.result) return set({ saved: {}, isLoading: false, isError: true })
    set({
      saved: res.result,
      isLoading: false,
      isError: false,
    })
  }, [athena, isOwner])

  const get = useCallback((key: DeviceParamKey) => saved[key], [saved])

  const save = useCallback(
    async (changes: Changes = {}) => {
      set((x) => ({ isSaving: true, saved: { ...x.saved, ...changes } }))
      const result = await athena('saveParams', { params_to_update: changes })

      const errors = Object.entries(result?.result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) errors.forEach(([k, v]) => console.error(`${k}: ${v.replace('error: ', '')}`))

      set({ isSaving: false })
      return result
    },
    [athena],
  )

  return { isLoading, isError, isSaving, saved, set, save, get, initialized }
}
