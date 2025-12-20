import { createContext, useContext, ReactNode, useMemo, useState, useCallback } from 'react'
import { useRouteParams, useAsyncMemo } from '../../utils/hooks'
import { useStorage } from '../../utils/storage'
import { callAthena, ParamValue } from '../../api/athena'

const decode = (v: string | null | undefined) => {
  if (!v) return null
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0)))
  } catch {
    return atob(v)
  }
}

type DeviceParamsContextValue = {
  dongleId: string
  params: ParamValue[] | null
  isLoading: boolean
  isError: boolean
  favorites: Record<string, string>
  currentRoute: string | null
  setCurrentRoute: (route: string | null) => void
}

const DeviceParamsContext = createContext<DeviceParamsContextValue | null>(null)

export const DeviceParamsProvider = ({ children }: { children: ReactNode }) => {
  const { dongleId } = useRouteParams()
  const [usingCorrectFork] = useStorage('usingCorrectFork')

  const res = useAsyncMemo(
    async () => {
      if (!usingCorrectFork) return { params: null, error: false }
      const res = await callAthena({ type: 'getAllParams', dongleId, params: {} })
      if (res?.error || !res?.result) return { params: null, error: true }
      return { params: res.result, error: false }
    },
    [dongleId, usingCorrectFork],
    undefined,
  )

  const favorites = useMemo(() => {
    if (!res?.params) return {}
    const param = res.params.find((p) => p.key === 'MapboxFavorites')
    const decoded = decode(param?.value)
    if (!decoded) return {}
    try {
      return JSON.parse(decoded) as Record<string, string>
    } catch {
      return {}
    }
  }, [res?.params])

  const routeFromParams = useMemo(() => {
    if (!res?.params) return null
    const param = res.params.find((p) => p.key === 'MapboxRoute')
    return decode(param?.value) || null
  }, [res?.params])

  const [localRoute, setLocalRoute] = useState<string | null | undefined>(undefined)
  const currentRoute = localRoute === undefined ? routeFromParams : localRoute

  const setCurrentRoute = useCallback((route: string | null) => {
    setLocalRoute(route)
  }, [])

  return (
    <DeviceParamsContext.Provider
      value={{
        dongleId,
        params: res?.params ?? null,
        isLoading: res === undefined,
        isError: res?.error ?? false,
        favorites,
        currentRoute,
        setCurrentRoute,
      }}
    >
      {children}
    </DeviceParamsContext.Provider>
  )
}

export const useDeviceParams = () => {
  const context = useContext(DeviceParamsContext)
  // Return fallback when used outside provider (e.g., Sidebar's ActionBar)
  if (!context) {
    return {
      dongleId: '',
      params: null,
      isLoading: true,
      isError: false,
      favorites: {} as Record<string, string>,
      currentRoute: null,
      setCurrentRoute: () => {},
    }
  }
  return context
}
