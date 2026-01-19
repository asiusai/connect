import { create } from 'zustand'
import { callAthena } from '../../api/athena'
import { decode, encode, parse, ZustandType } from '../../utils/helpers'
import { DeviceParamKey } from '../../utils/params'
import { toast } from 'sonner'
import { useAsyncEffect, useRouteParams } from '../../utils/hooks'
import { useCallback, useMemo } from 'react'

type Changes = Partial<Record<DeviceParamKey, string | null>>
const init = {
  initialized: false,
  changes: {} as Changes,
  saved: {} as Changes,
  types: {} as Partial<Record<DeviceParamKey, number>>,
  isLoading: false,
  isError: false,
  isSaving: false,
}

const useDeviceParamsStore = create<ZustandType<typeof init>>((set) => ({ ...init, set }))

export const useDeviceParams = () => {
  const { isLoading, isError, isSaving, set, changes, saved, types, initialized } = useDeviceParamsStore()
  const { dongleId } = useRouteParams()

  useAsyncEffect(async () => {
    console.log({ initialized, dongleId })
    if (initialized) return
    set({ isLoading: true, isError: false, initialized: true })

    const res = await callAthena({ type: 'getAllParams', dongleId, params: {} })
    console.log(res)
    if (res?.error || !res?.result) return set({ saved: {}, types: {}, isLoading: false, isError: true })
    set({
      saved: Object.fromEntries(res.result.map((x) => [x.key, decode(x.value) ?? null])),
      types: Object.fromEntries(res.result.map((x) => [x.key, x.type])),
      isLoading: false,
      isError: false,
    })
  }, [dongleId, initialized])

  const get = useCallback(
    (key: DeviceParamKey) => {
      if (key in changes) return changes[key]
      if (key in saved) return saved[key]
      return undefined
    },
    [changes, saved],
  )

  const save = useCallback(
    async (newChanges: Changes = {}) => {
      newChanges = { ...changes, ...newChanges }
      set({ isSaving: true, changes: newChanges })
      const params_to_update = Object.fromEntries(Object.entries(newChanges).map(([k, v]) => [k, v === null ? null : encode(v)]))
      const result = await callAthena({ type: 'saveParams', dongleId, params: { params_to_update } })

      const errors = Object.entries(result?.result ?? {}).filter(([_, v]) => v.startsWith('error:'))
      if (errors.length) errors.forEach(([k, v]) => console.error(`${k}: ${v.replace('error: ', '')}`))

      set((x) => ({ saved: { ...x.saved, ...newChanges }, changes: {}, isSaving: false }))
      return result
    },
    [changes, dongleId],
  )

  const setMapboxRoute = useCallback(
    async (address: string | null) => {
      const res = await save({ MapboxRoute: address })
      if (res?.error) toast.error(res.error.data?.message ?? res.error.message ?? 'Error setting route')
      else toast.success(address ? `Navigating to ${address}` : 'Navigation cleared')
      return res
    },
    [save],
  )

  const setSSHKey = async (username: string) => {
    const key = await fetch(`https://github.com/${username}.keys`).then((x) => x.text())
    return await save({ GithubUsername: username, GithubSshKeys: key })
  }

  const favorites = useMemo(() => parse<Record<string, string>>(get('MapboxFavorites')) ?? { home: '', work: '' }, [get])
  const route = get('MapboxRoute')

  return { isLoading, isError, isSaving, types, changes, saved, set, setSSHKey, favorites, route, setMapboxRoute, save, get, initialized }
}
