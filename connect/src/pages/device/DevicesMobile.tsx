import { ReactNode, useState } from 'react'
import { api } from '../../api'
import { getDeviceName } from '../../../../shared/types'
import { useAsyncEffect, useRouteParams } from '../../hooks'
import { Active, Devices } from './Devices'
import { BatteryFullIcon, BatteryLowIcon, BatteryMediumIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '../../../../shared/helpers'
import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'
import { useAthena } from '../../hooks/useAthena'
import { useAuth } from '../../hooks/useAuth'
import { Logo } from '../../../../shared/components/Logo'
import { useNavigate } from 'react-router-dom'

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

const MobileSheet = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) => {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-999999 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute top-0 left-0 w-full bg-background rounded-b-3xl shadow-2xl overflow-hidden">{children}</div>
      <div className="absolute inset-0 z-[-1]" onClick={onClose} />
    </div>,
    document.body,
  )
}

export const AccountSwitcherMobile = () => {
  const navigate = useNavigate()
  const { logins, logIn, logOut, id, token } = useAuth()
  const [user] = api.auth.me.useQuery({ enabled: !!token })
  const [open, setOpen] = useState(false)

  if (!user) return null
  return (
    <>
      <div
        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer border border-white/10"
        onClick={() => setOpen(true)}
      >
        <Logo provider={logins.find((l) => l.id === id)?.provider ?? 'asius'} className="w-5 h-5" />
      </div>
      <MobileSheet open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold">Switch Account</h2>
          <div className="p-2 -mr-2 cursor-pointer hover:bg-white/5 rounded-full" onClick={() => setOpen(false)}>
            <XIcon className="text-xl" />
          </div>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {logins.map((account) => (
            <div
              key={account.id}
              onClick={() => {
                logIn(account)
                setOpen(false)
                navigate('/')
              }}
              className={cn('flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors', account.id === id ? 'bg-white/10' : 'hover:bg-white/5')}
            >
              <Logo provider={account.provider} className="w-6 h-6 shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-bold truncate">{account.name}</span>
                <span className="text-xs text-white/40 capitalize">{account.provider}</span>
              </div>
              <button
                className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  logOut(account.id)
                }}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer text-white/60 hover:text-white transition-colors border border-dashed border-white/10 mt-1"
            onClick={() => {
              setOpen(false)
              navigate('/login')
            }}
          >
            <PlusIcon className="text-xl" />
            <span className="font-medium text-sm">Add account</span>
          </div>
        </div>
      </MobileSheet>
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
      <MobileSheet open={open} onClose={() => setOpen(false)}>
        <Devices close={() => setOpen(false)} />
      </MobileSheet>
    </>
  )
}
