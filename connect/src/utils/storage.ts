import { useState, useEffect, useCallback } from 'react'
import type { CameraType, LogType, Service, TimeFormat, UnitFormat } from '../../../shared/types'
import { Action } from '../pages/device/ActionBar'
import { DEVICE_PARAMS, ParamType } from '../utils/params'
import { provider } from '../../../shared/provider'

const STORAGES = {
  actions: (): Action[] => [
    { type: 'toggle', icon: 'power_settings_new', title: DEVICE_PARAMS.DoShutdown.label, toggleKey: 'DoShutdown', toggleType: ParamType.Boolean },
    // { type: 'toggle', icon: 'joystick', title: DEVICE_PARAMS.JoystickDebugMode.label, toggleKey: 'JoystickDebugMode', toggleType: DeviceParamType.Boolean },
    { type: 'navigation', icon: 'home', title: 'Navigate to home', location: 'home' },
    { type: 'navigation', icon: 'work', title: 'Navigate to work', location: 'work' },
    { type: 'redirect', icon: 'camera', title: 'Take snapshot', href: `/{dongleId}/sentry` },
  ],
  usingCorrectFork: (): boolean | undefined => undefined,
  playbackRate: (): number | undefined => 1,
  accessToken: (): string | undefined => undefined,
  lastDongleId: (): string | undefined => undefined,
  largeCameraType: (): CameraType => (provider.IS_OURS ? 'cameras' : 'qcameras'),
  smallCameraType: (): CameraType | undefined => (provider.IS_OURS ? 'dcameras' : undefined),
  logType: (): LogType | undefined => undefined,
  showPath: (): boolean => false,
  statsTime: (): 'all' | 'week' => 'all',
  routesType: (): 'all' | 'preserved' => 'all',
  analyzeService: (): Service => 'peripheralState',
  togglesOpenTab: (): string | null => 'models',
  cameraView: (): 'both' | 'driver' | 'road' => 'both',
  joystickEnabled: (): boolean => false,

  unitFormat: (): UnitFormat => {
    if (typeof navigator === 'undefined') return 'metric'
    const locale = navigator?.language.toLowerCase()
    const value: UnitFormat = locale.startsWith('en-us') ? 'imperial' : 'metric'
    storage.set('unitFormat', value)
    return value
  },
  timeFormat: (): TimeFormat => {
    if (typeof Intl === 'undefined') return '24h'
    const options = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions()
    const value = options.hourCycle?.startsWith('h1') ? '12h' : '24h'
    storage.set('timeFormat', value)
    return value
  },
}

export type StorageKey = keyof typeof STORAGES
export type StorageValue<K extends StorageKey> = ReturnType<(typeof STORAGES)[K]>

export const storage = {
  get: <K extends StorageKey>(key: K): StorageValue<K> => {
    if (typeof localStorage === 'undefined') return STORAGES[key]() as any

    try {
      const item = localStorage.getItem(key)
      if (item) return JSON.parse(item)
    } catch (e) {
      console.warn(e)
    }
    return STORAGES[key]() as any
  },
  set: <K extends StorageKey>(key: K, value: StorageValue<K>): void => {
    if (typeof localStorage === 'undefined') return
    value === undefined ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('local-storage', { detail: { key, value } }))
  },
}

export const useStorage = <K extends StorageKey, V = StorageValue<K>>(key: K): [V, (value: V) => void] => {
  const [value, setStateValue] = useState<V>(storage.get(key) as V)

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.storageArea === localStorage) setStateValue(storage.get(key) as V)
    }

    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail.key === key && value !== event.detail.value) setStateValue(event.detail.value)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('local-storage', handleCustomStorageChange as EventListener)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage', handleCustomStorageChange as EventListener)
    }
  }, [key, value])

  const setValue = useCallback(
    (newValue: V) => {
      setStateValue(newValue)
      storage.set(key, newValue as any)
    },
    [key],
  )

  return [value, setValue]
}
