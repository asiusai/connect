import { api } from '../../api'
import { getDeviceName } from '../../../../shared/types'
import { useRouteParams } from '../../hooks'
import { Active } from './Devices'
import {
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  WifiIcon,
  BluetoothIcon,
  VideoIcon,
  SwitchCameraIcon,
  ChevronDownIcon,
  ActivityIcon,
} from 'lucide-react'
import { cn } from '../../../../shared/helpers'
import { useDevice } from '../../hooks/useDevice'
import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import { Logo } from '../../../../shared/components/Logo'
import { useTopMenu } from './TopMenu'
import { CSSProperties } from 'react'
import { useLiveView } from './LiveCamera'

const Voltage = ({ voltage }: { voltage: string }) => {
  const v = (Number(voltage) / 1000).toFixed(1)
  const num = Number(v)
  const color = num < 12.1 ? 'text-red-400' : num < 12.4 ? 'text-yellow-400' : 'text-green-400'
  const Icon = num < 12.1 ? BatteryLowIcon : num < 12.4 ? BatteryMediumIcon : BatteryFullIcon
  return (
    <div className={cn('flex gap-1 items-center', color)}>
      <Icon className="text-[18px]!" />
      <p>{v}V</p>
    </div>
  )
}

export const DeviceTitle = ({ style }: { style?: CSSProperties }) => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const { usingAsiusPilot, liveCamera, set: setSettings } = useSettings()
  const { voltage, ble, athena, connected } = useDevice()
  const { provider } = useAuth()
  const { set: setTopMenu } = useTopMenu()
  const { viewMode, set: setLiveView } = useLiveView()

  if (!device) return

  return (
    <div className="absolute z-999 top-0 w-full pt-[env(safe-area-inset-top)]" style={style}>
      <div className="flex items-start justify-between w-full p-4">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTopMenu({ devices: true })}>
            <h1 className="text-2xl font-bold">{getDeviceName(device)}</h1>
            <ChevronDownIcon className="drop-shadow-md md:hidden" />
          </div>
          <div className="flex items-center gap-3 text-sm font-medium opacity-90">
            <Active device={device} />
            {voltage && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/40" />
                <Voltage voltage={voltage} />
              </>
            )}
          </div>
          <div className="flex items-center gap-3 opacity-90">
            <WifiIcon className={cn('text-lg', athena.connected ? 'text-green-500' : 'text-white/30')} />
            {usingAsiusPilot && (
              <BluetoothIcon
                onClick={() => {
                  if (ble.connected) ble.disconnect()
                  else ble.connect()
                }}
                className={cn(
                  'text-lg cursor-pointer',
                  ble.status === 'connected' ? 'text-indigo-500' : ble.status === 'connecting' ? 'text-indigo-400 animate-pulse' : 'text-white/30',
                )}
              />
            )}
            {usingAsiusPilot && connected && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/40" />
                <button
                  onClick={() => setLiveView({ viewMode: viewMode === 'map' ? 'camera' : 'map', liveView: viewMode === 'map' })}
                  className={cn('flex items-center gap-1 transition-all', viewMode === 'camera' ? 'text-red-400' : 'text-white/40')}
                >
                  <VideoIcon className="text-lg!" />
                </button>
                <button
                  onClick={() => setLiveView({ viewMode: viewMode === 'data' ? 'map' : 'data', liveView: viewMode !== 'data' })}
                  className={cn('flex items-center gap-1 transition-all', viewMode === 'data' ? 'text-green-400' : 'text-white/40')}
                >
                  <ActivityIcon className="text-lg!" />
                </button>
                {viewMode === 'camera' && (
                  <button
                    onClick={() => setSettings({ liveCamera: liveCamera === 'driver' ? 'road' : 'driver' })}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <SwitchCameraIcon className="text-lg!" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div
          onClick={() => setTopMenu({ account: true })}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer border border-white/10 md:hidden"
        >
          <Logo provider={provider} className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
