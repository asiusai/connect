import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ChevronDownIcon, PlusIcon, ShieldIcon, XIcon } from 'lucide-react'
import { getDeviceName, User } from '../../../shared/types'
import { useState } from 'react'
import { Active, Devices } from '../pages/device/Devices'
import { Navigation } from '../pages/device/Navigation'
import { ActionBar } from '../pages/device/ActionBar'
import { useRouteParams } from '../hooks'
import { Voltage } from '../pages/device/DevicesMobile'
import { Logo } from '../../../shared/components/Logo'
import { cn, getUserName } from '../../../shared/helpers'
import { useAuth } from '../hooks/useAuth'

const AccountSwitcher = ({ user }: { user: User }) => {
  const navigate = useNavigate()
  const { logins, logIn, logOut, id } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative pt-6 border-t border-white/5">
      <div className="flex items-center justify-between px-2 cursor-pointer group" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2 min-w-0">
          <Logo provider={logins.find((l) => l.id === id)?.provider ?? 'asius'} className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium truncate text-white/90" title={getUserName(user)}>
            {getUserName(user)}
          </span>
        </div>
        <ChevronDownIcon className={cn('w-4 h-4 text-white/40 group-hover:text-white transition-all duration-200', open && 'rotate-180')} />
      </div>

      {open && (
        <>
          <div className="absolute inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 bg-background rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex flex-col p-2">
              {logins.map((account) => (
                <div
                  key={account.id}
                  onClick={() => {
                    logIn(account)
                    setOpen(false)
                    navigate('/')
                  }}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group/item',
                    account.id === id ? 'bg-white/10' : 'hover:bg-white/5',
                  )}
                >
                  <Logo provider={account.provider} className="w-5 h-5 shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{account.name}</span>
                    <span className="text-xs text-white/40 capitalize">{account.provider}</span>
                  </div>
                  <button
                    className="p-1 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors opacity-0 group-hover/item:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      logOut(account.id)
                    }}
                    title="Remove account"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/login')
                }}
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Add account</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export const Sidebar = () => {
  const { token } = useAuth()
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const [user] = api.auth.me.useQuery({ enabled: !!token })
  const [showDeviceList, setShowDeviceList] = useState(false)

  return (
    <div className="hidden md:flex w-64 h-full relative">
      <div className="flex flex-col w-64 h-screen top-0 border-r border-b border-white/5 bg-background shrink-0 fixed">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Logo provider="asius" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">connect</span>
          </Link>
        </div>

        {/* Device Selector */}
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
                    <Voltage />
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

        {device && (
          <div className="px-4 flex flex-col gap-1">
            <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">Menu</div>
            <Navigation />
          </div>
        )}

        {/* Bottom Section: Quick Actions & User */}
        <div className="p-4 flex flex-col gap-4 bg-background mt-auto">
          {device && <ActionBar />}

          {user?.superuser && (
            <Link to="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary transition-colors text-primary-x">
              <ShieldIcon className="text-xl" />
              <span className="text-sm font-medium">Admin</span>
            </Link>
          )}

          {user && <AccountSwitcher user={user} />}
        </div>
      </div>
    </div>
  )
}
