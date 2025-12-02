import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { callAthena } from '../../api/athena'
import { useDevice } from '../../api/queries'
import { getDeviceName } from '../../types'
import { useRouteParams } from '../../utils/hooks'
import { Active, Devices } from './Devices'
import { Icon } from '../../components/Icon'
import { createPortal } from 'react-dom'

const getBatteryColor = (value: number) => (value < 12.1 ? 'text-red-400' : value < 12.4 ? 'text-yellow-400' : 'text-green-400')

export const Battery = () => {
  const { dongleId } = useRouteParams()
  const [battery, setBattery] = useState<number>()
  useEffect(() => {
    if (dongleId) {
      callAthena({ type: 'getMessage', dongleId, params: { service: 'peripheralState', timeout: 5000 } }).then((x) =>
        setBattery(x ? x.peripheralState.voltage / 1000 : undefined),
      )
    }
  }, [dongleId])
  if (!battery) return null
  return (
    <>
      <div className="w-1 h-1 rounded-full bg-white/40" />
      <div className={clsx('flex gap-1 items-center', getBatteryColor(battery))}>
        <Icon name="battery_5_bar" className="rotate-90 !text-[18px]" />
        <p>{battery.toFixed(1)}V</p>
      </div>
    </>
  )
}
export const DevicesMobile = () => {
  const { dongleId } = useRouteParams()
  const [device] = useDevice(dongleId)
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get('devices') === 'true'

  const setOpen = (newOpen: boolean) => setSearchParams(newOpen ? { devices: 'true' } : {})

  if (!device) return
  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpen(true)}>
          <h1 className="text-2xl font-bold">{getDeviceName(device)}</h1>
          <Icon name="keyboard_arrow_down" className="drop-shadow-md" />
        </div>
        <div className="flex items-center gap-3 text-sm font-medium opacity-90">
          <Active device={device} />
          <Battery/>
        </div>
      </div>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
