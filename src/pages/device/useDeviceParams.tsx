import { create } from 'zustand'
import { AthenaResponse, callAthena } from '../../api/athena'
import { decode, encode, parse } from '../../utils/helpers'
import { DeviceParamKey } from '../../utils/params'
import { toast } from 'sonner'

type DeviceParamsState = {
  // State
  dongleId: string | undefined
  changes: Partial<Record<DeviceParamKey, string | null>>
  saved: Partial<Record<DeviceParamKey, string | null>>
  types: Partial<Record<DeviceParamKey, number>>
  isLoading: boolean
  isError: boolean
  isSaving: boolean

  // Actions
  load: (dongleId: string) => Promise<void>
  get: (key: DeviceParamKey) => string | null | undefined
  save: (changes: Partial<Record<DeviceParamKey, string | null>>) => Promise<AthenaResponse<'saveParams'> | undefined>
  setChanges: (changes: Partial<Record<DeviceParamKey, string | null>>) => void
  recompute: () => void

  // Nav
  favorites: Record<string, string> | undefined
  route: string | null | undefined
  setMapboxRoute: (address: string | null) => Promise<AthenaResponse<'saveParams'> | undefined>
}

export const useDeviceParams = create<DeviceParamsState>((set, get) => ({
  isLoading: false,
  isError: false,
  isSaving: false,

  dongleId: undefined,
  changes: {},
  saved: {},
  types: {},

  favorites: undefined,
  route: undefined,

  load: async (dongleId: string) => {
    set({ dongleId: dongleId, isLoading: true, isError: false })

    const res = await callAthena({ type: 'getAllParams', dongleId, params: {} })
    if (res?.error || !res?.result) return set({ saved: {}, types: {}, isLoading: false, isError: true })

    set({
      saved: Object.fromEntries(res.result.map((x) => [x.key, decode(x.value) ?? null])),
      types: Object.fromEntries(res.result.map((x) => [x.key, x.type])),
      isLoading: false,
      isError: false,
    })
    get().recompute()
  },
  get: (key: DeviceParamKey) => {
    const state = get()
    if (key in state.changes) return state.changes[key]
    if (key in state.saved) return state.saved[key]
    return undefined
  },

  save: async (changes = {}) => {
    changes = { ...get().changes, ...changes }
    set({ isSaving: true, changes: changes })
    const params_to_update = Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v === null ? null : encode(v)]))
    const result = await callAthena({ type: 'saveParams', dongleId: get().dongleId!, params: { params_to_update } })

    const errors = Object.entries(result?.result ?? {}).filter(([_, v]) => v.startsWith('error:'))
    if (errors.length) errors.forEach(([k, v]) => console.error(`${k}: ${v.replace('error: ', '')}`))

    set((x) => ({ saved: { ...x.saved, ...changes }, changes: {}, isSaving: false }))
    get().recompute()
    return result
  },
  setChanges: (changes) => {
    set({ changes })
    get().recompute()
  },
  recompute: () =>
    set({
      favorites: parse<Record<string, string>>(get().get('MapboxFavorites')) ?? { home: '', work: '' },
      route: get().get('MapboxRoute'),
    }),

  setMapboxRoute: async (address: string | null) => {
    const res = await get().save({ MapboxRoute: address })
    if (res?.error) toast.error(res.error.data?.message ?? res.error.message ?? 'Error setting route')
    else toast.success(address ? `Navigating to ${address}` : 'Navigation cleared')
    return res
  },
}))
