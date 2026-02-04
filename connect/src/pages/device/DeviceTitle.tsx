import { api } from '../../api'
import { getDeviceName } from '../../../../shared/types'
import { useRouteParams } from '../../hooks'
import { Active } from './Devices'
import { BatteryFullIcon, BatteryLowIcon, BatteryMediumIcon, WifiIcon, BluetoothIcon } from 'lucide-react'
import { cn } from '../../../../shared/helpers'
import { useSidebar } from '../../components/Sidebar'
import { useDevice } from '../../hooks/useDevice'
import { useSettings } from '../../hooks/useSettings'

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

export const DeviceTitle = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const { set } = useSidebar()
  const usingAsiusPilot = useSettings((x) => x.usingAsiusPilot)
  const { voltage, ble, athena } = useDevice()

  if (!device) return

  return (
    <div className="absolute z-999 top-0 w-full p-4">
      <div className="flex items-center justify-start gap-4 w-full" onClick={() => set({ open: true })}>
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold">{getDeviceName(device)}</h1>
          <div className="flex items-center gap-3 text-sm font-medium opacity-90">
            <Active device={device} />
            <div className="w-1 h-1 rounded-full bg-white/40" />
            <WifiIcon className={cn('text-lg', athena.status === 'connected' ? 'text-green-500' : 'text-white/30')} />
            {usingAsiusPilot && (
              <BluetoothIcon
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  if (ble.status === 'connected') ble.disconnect()
                  else ble.connect()
                }}
                className={cn(
                  'text-lg cursor-pointer',
                  ble.status === 'connected' ? 'text-indigo-500' : ble.status === 'connecting' ? 'text-indigo-400 animate-pulse' : 'text-white/30',
                )}
              />
            )}
            {voltage && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/40" />
                <Voltage voltage={voltage} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
