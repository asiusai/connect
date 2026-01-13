import clsx from 'clsx'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { Device, getDeviceName, getCommaName } from '../../types'
import { timeAgo } from '../../utils/format'
import { Icon } from '../../components/Icon'

export const Active = ({ device, className }: { device: Device; className?: string }) => {
  if (!device.last_athena_ping) return <span className={clsx('text-white/30', className)}>Offline</span>
  return (
    <p className={clsx(Math.floor(Date.now() / 1000) - device.last_athena_ping < 120 ? 'text-green-400' : 'text-white/70', className)}>
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
      className={clsx(
        'flex flex-col w-full bg-background text-background-x overflow-hidden',
        isDropdown ? 'max-h-[400px]' : 'animate-in slide-in-from-top-5 fade-in duration-200 max-h-[60vh]',
      )}
    >
      {!isDropdown && (
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold">Switch Device</h2>
          <div className="p-2 -mr-2 cursor-pointer hover:bg-white/5 rounded-full" onClick={close}>
            <Icon name="close" className="text-xl" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 p-2 overflow-y-auto">
        {devices?.map((device) => (
          <div
            key={device.dongle_id}
            className={clsx(
              'flex items-center justify-between p-3 rounded-xl cursor-pointer shrink-0 relative overflow-hidden transition-colors',
              device.dongle_id === dongleId ? 'bg-white/10' : 'hover:bg-white/5',
            )}
            onClick={() => {
              close()
              navigate(`/${device.dongle_id}`)
            }}
          >
            <div className="flex flex-col gap-0.5 z-10">
              <span className="text-sm font-bold text-white">{getDeviceName(device)}</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/60">{getCommaName(device)}</span>
                {/* <span className="text-white/40">•</span> */}
                {/* <Active device={device} className="text-xs" /> */}
              </div>
            </div>
            {device.dongle_id === dongleId && <Icon name="check" className="text-green-400" />}
          </div>
        ))}

        <div
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer text-white/60 hover:text-white mt-1 transition-colors border border-dashed border-white/10"
          onClick={() => {
            close()
            navigate('/pair')
          }}
        >
          <Icon name="add" className="text-xl" />
          <span className="font-medium text-sm">Pair new device</span>
        </div>
      </div>
    </div>
  )
}
