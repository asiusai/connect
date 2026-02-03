import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { Device, getDeviceName, getCommaName } from '../../../../shared/types'
import { timeAgo } from '../../utils/format'
import { ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react'
import { cn } from '../../../../shared/helpers'
import { useState } from 'react'
import { useRouteParams } from '../../hooks'

export const Active = ({ device, className }: { device: Device; className?: string }) => {
  if (!device.last_athena_ping) return <span className={cn('text-white/30', className)}>Offline</span>
  return (
    <p className={cn(Math.floor(Date.now() / 1000) - device.last_athena_ping < 120 ? 'text-green-400' : 'text-white/70', className)}>
      {timeAgo(device.last_athena_ping)}
    </p>
  )
}

export const Devices = ({ close, isDropdown }: { close: () => void; isDropdown?: boolean }) => {
  const [devices] = api.devices.devices.useQuery({})
  const navigate = useNavigate()
  const { dongleId } = useParams()

  return (
    <div
      className={cn(
        'flex flex-col w-full bg-background text-background-x overflow-hidden',
        isDropdown ? 'max-h-100' : 'animate-in slide-in-from-top-5 fade-in duration-200 max-h-[60vh]',
      )}
    >
      {!isDropdown && (
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold">Switch Device</h2>
          <div className="p-2 -mr-2 cursor-pointer hover:bg-white/5 rounded-full" onClick={close}>
            <XIcon className="text-xl" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 p-2 overflow-y-auto">
        {devices?.map((device) => (
          <div
            key={device.dongle_id}
            className={cn(
              'flex flex-col gap-0.5 p-3 rounded-xl cursor-pointer shrink-0 transition-colors',
              device.dongle_id === dongleId ? 'bg-white/10 border border-green-500/50' : 'hover:bg-white/5',
            )}
            onClick={() => {
              close()
              navigate(`/${device.dongle_id}`)
            }}
          >
            <span className="text-sm font-bold text-white">{getDeviceName(device)}</span>
            <div className="flex items-center gap-2 text-xs">
              <Active device={device} className="text-xs" />
              <span className="text-white/40">·</span>
              <span className="text-white/60">{getCommaName(device)}</span>
            </div>
          </div>
        ))}

        <div
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer text-white/60 hover:text-white mt-1 transition-colors border border-dashed border-white/10"
          onClick={() => {
            close()
            navigate('/pair')
          }}
        >
          <PlusIcon className="text-xl" />
          <span className="font-medium text-sm">Pair new device</span>
        </div>
      </div>
    </div>
  )
}

export const DeviceSelector = () => {
  const { dongleId } = useRouteParams()
  const [showDeviceList, setShowDeviceList] = useState(false)
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })

  return (
    <div className="px-4 pb-6">
      <div className="relative">
        <div
          className="flex items-center justify-between p-3 rounded-xl bg-background-alt hover:bg-white/5 cursor-pointer transition-colors border border-white/5 group"
          onClick={() => setShowDeviceList(!showDeviceList)}
        >
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-lg truncate">{device ? getDeviceName(device) : 'Select Device'}</span>
            {device && (
              <div className="flex items-center gap-3 text-sm font-medium opacity-90">
                <Active device={device} />

                <span className="text-white/40">·</span>
                <span className="text-white/60">{getCommaName(device)}</span>
              </div>
            )}
          </div>
          <ChevronDownIcon className={cn('text-white/60 group-hover:text-white transition-colors duration-200', showDeviceList && 'rotate-180')} />
        </div>

        {showDeviceList && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDeviceList(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-background rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <Devices close={() => setShowDeviceList(false)} isDropdown />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
