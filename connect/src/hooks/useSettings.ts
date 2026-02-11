import type { CameraType, LogType, Service, TimeFormat, UnitFormat } from '../../../shared/types'
import { persist, createJSONStorage } from 'zustand/middleware'
import { create } from 'zustand'
import { ZustandType } from '../../../shared/helpers'

const getDefaultUnitFormat = () => {
  if (typeof navigator === 'undefined') return 'metric'
  const locale = navigator?.language.toLowerCase()
  return locale.startsWith('en-us') ? 'imperial' : ('metric' as UnitFormat)
}

const getDefaultTimeFormat = () => {
  if (typeof Intl === 'undefined') return '24h'
  const options = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions()
  return options.hourCycle?.startsWith('h1') ? '12h' : ('24h' satisfies TimeFormat)
}

export type PinnedSignal = {
  messageAddress: number
  messageSrc: number
  messageName: string
  signalName: string
}

const init = {
  usingAsiusPilot: undefined as boolean | undefined,
  playbackRate: 1 as number | undefined,
  lastDongleId: undefined as string | undefined,
  largeCameraType: 'qcameras' as CameraType,
  smallCameraType: undefined as CameraType | undefined,
  logType: undefined as LogType | undefined,
  showPath: false,
  statsTime: 'all' as 'all' | 'week',
  routesType: 'all' as 'all' | 'preserved',
  homeTab: 'drives' as 'drives' | 'controls' | 'device' | 'developer' | 'apps',
  analyzeService: 'peripheralState' as Service,
  togglesOpenTab: 'models' as string | null,
  cameraView: 'both' as 'both' | 'driver' | 'road',
  liveCamera: 'road' as 'driver' | 'road',
  joystickEnabled: false,
  unitFormat: getDefaultUnitFormat(),
  timeFormat: getDefaultTimeFormat(),
  pinnedSignals: [] as PinnedSignal[],
}

export const useSettings = create(
  persist<ZustandType<typeof init>>((set) => ({ ...init, set }), {
    name: 'settings',
    storage: createJSONStorage(() => localStorage),
  }),
)
