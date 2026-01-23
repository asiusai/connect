import { useState } from 'react'
import { useAthena } from '../../api/athena'
import { api } from '../../api'
import { getDeviceName } from '../../../../shared/types'
import { useAsyncEffect, useIsDeviceOwner, useRouteParams } from '../../utils/hooks'
import { Active, Devices } from './Devices'
import { BatteryFullIcon, ChevronDownIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '../../../../shared/helpers'

const getVoltageColor = (voltage: number) => (voltage < 12.1 ? 'text-red-400' : voltage < 12.4 ? 'text-yellow-400' : 'text-green-400')

export const Voltage = () => {
  const [voltage, setVoltage] = useState<string>()
  const isOwner = useIsDeviceOwner()
  const athena = useAthena()
  useAsyncEffect(async () => {
    if (!isOwner) return
    const res = await athena('getMessage', { service: 'peripheralState', timeout: 5000 })
    setVoltage(res?.result ? (res.result.peripheralState.voltage / 1000).toFixed(1) : undefined)
  }, [athena])
  if (!voltage) return null
  return (
    <>
      <div className="w-1 h-1 rounded-full bg-white/40" />
      <div className={cn('flex gap-1 items-center', getVoltageColor(Number(voltage)))}>
        <BatteryFullIcon className="rotate-90 text-[18px]!" />
        <p>{voltage}V</p>
      </div>
    </>
  )
}

export const DevicesMobile = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const [open, setOpen] = useState(false)

  if (!device) return
  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpen(true)}>
          <h1 className="text-2xl font-bold">{getDeviceName(device)}</h1>
          <ChevronDownIcon className="drop-shadow-md" />
        </div>
        <div className="flex items-center gap-3 text-sm font-medium opacity-90">
          <Active device={device} />
          <Voltage />
        </div>
      </div>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-999999 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute top-0 left-0 w-full bg-surface rounded-b-3xl shadow-2xl overflow-hidden">
              <Devices close={() => setOpen(false)} />
            </div>
            <div className="absolute inset-0 z-[-1]" onClick={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </>
  )
}
