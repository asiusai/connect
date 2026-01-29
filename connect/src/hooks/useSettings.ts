import type { CameraType, LogType, Service, TimeFormat, UnitFormat } from '../../../shared/types'
import { Action } from '../pages/device/ActionBar'
import { DEVICE_PARAMS, ParamType } from '../utils/params'
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

const init = {
  actions: [
    { type: 'toggle', icon: 'power_settings_new', title: DEVICE_PARAMS.DoShutdown.label, toggleKey: 'DoShutdown', toggleType: ParamType.BOOL },
    { type: 'toggle', icon: 'joystick', title: DEVICE_PARAMS.JoystickDebugMode.label, toggleKey: 'JoystickDebugMode', toggleType: ParamType.BOOL },
    { type: 'redirect', icon: 'camera', title: 'Take snapshot', href: `/{dongleId}/sentry` },
  ] satisfies Action[],
  usingAsiusPilot: undefined as boolean | undefined,
  playbackRate: 1 as number | undefined,
  lastDongleId: undefined as string | undefined,
  largeCameraType: 'qcameras' as CameraType,
  smallCameraType: undefined as CameraType | undefined,
  logType: undefined as LogType | undefined,
  showPath: false,
  statsTime: 'all' as 'all' | 'week',
  routesType: 'all' as 'all' | 'preserved',
  analyzeService: 'peripheralState' as Service,
  togglesOpenTab: 'models' as string | null,
  cameraView: 'both' as 'both' | 'driver' | 'road',
  joystickEnabled: false,
  unitFormat: getDefaultUnitFormat(),
  timeFormat: getDefaultTimeFormat(),
}

export const useSettings = create(
  persist<ZustandType<typeof init>>((set) => ({ ...init, set }), {
    name: 'settings',
    storage: createJSONStorage(() => localStorage),
  }),
)
