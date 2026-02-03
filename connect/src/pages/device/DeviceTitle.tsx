import { useState } from 'react'
import { api } from '../../api'
import { getDeviceName } from '../../../../shared/types'
import { useAsyncEffect, useRouteParams } from '../../hooks'
import { Active } from './Devices'
import { BatteryFullIcon, BatteryLowIcon, BatteryMediumIcon } from 'lucide-react'
import { cn } from '../../../../shared/helpers'
import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'
import { useAthena } from '../../hooks/useAthena'
import { useSidebar } from '../../components/Sidebar'

const Voltage = () => {
  const [voltage, setVoltage] = useState<string>()
  const isOwner = useIsDeviceOwner()
  const athena = useAthena()
  useAsyncEffect(async () => {
    if (!isOwner) return
    const res = await athena('getMessage', { service: 'peripheralState', timeout: 5000 })
    setVoltage(res?.result ? (res.result.peripheralState.voltage / 1000).toFixed(1) : undefined)
  }, [athena])
  if (!voltage) return null

  const num = Number(voltage)
  const color = num < 12.1 ? 'text-red-400' : num < 12.4 ? 'text-yellow-400' : 'text-green-400'
  const Icon = num < 12.1 ? BatteryLowIcon : num < 12.4 ? BatteryMediumIcon : BatteryFullIcon
  return (
    <>
      <div className="w-1 h-1 rounded-full bg-white/40" />
      <div className={cn('flex gap-1 items-center', color)}>
        <Icon className="text-[18px]!" />
        <p>{voltage}V</p>
      </div>
    </>
  )
}

export const DeviceTitle = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const { set } = useSidebar()
  if (!device) return
  return (
    <div className="absolute z-999 top-0 w-full p-4">
      <div className="flex items-center justify-start gap-4 w-full" onClick={() => set({ open: true })}>
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold">{getDeviceName(device)}</h1>
          <div className="flex items-center gap-3 text-sm font-medium opacity-90">
            <Active device={device} />
            <Voltage />
          </div>
        </div>
      </div>
    </div>
  )
}
