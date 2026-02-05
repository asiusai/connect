import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { CarIcon, SlidersHorizontalIcon, SmartphoneIcon, CodeIcon, BlocksIcon, ChevronDownIcon, PlusIcon, ShieldIcon, XIcon } from 'lucide-react'
import { User } from '../../../shared/types'
import { useState } from 'react'
import { DeviceSelector } from '../pages/device/Devices'
import { useRouteParams } from '../hooks'
import { Logo } from '../../../shared/components/Logo'
import { cn, getUserName } from '../../../shared/helpers'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { type LucideIcon } from 'lucide-react'

type Tab = 'drives' | 'controls' | 'device' | 'developer' | 'apps'

const NAV_ITEMS: { title: string; icon: LucideIcon; tab: Tab; color: string }[] = [
  { title: 'Drives', icon: CarIcon, tab: 'drives', color: 'text-blue-400' },
  { title: 'Device', icon: SmartphoneIcon, tab: 'device', color: 'text-yellow-400' },
  { title: 'Controls', icon: SlidersHorizontalIcon, tab: 'controls', color: 'text-green-400' },
  { title: 'Developer', icon: CodeIcon, tab: 'developer', color: 'text-cyan-400' },
  { title: 'Apps', icon: BlocksIcon, tab: 'apps', color: 'text-orange-400' },
]

export const Navigation = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const navigate = useNavigate()
  const { homeTab, set: setSettings } = useSettings()

  return (
    <div className={cn('grid grid-cols-1 gap-0', className)}>
      {NAV_ITEMS.map(({ title, icon: Icon, tab, color }) => (
        <button
          key={tab}
          onClick={() => {
            setSettings({ homeTab: tab })
            navigate(`/${dongleId}`)
          }}
          className={cn(
            'flex flex-row bg-transparent items-center gap-3 px-3 py-3 rounded-lg transition-colors font-medium',
            homeTab === tab ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/70',
          )}
        >
          <Icon className={cn('text-2xl', color)} />
          <span>{title}</span>
        </button>
      ))}
    </div>
  )
}

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

  return (
    <div className={cn('w-64 h-full relative z-99 hidden md:flex')}>
      <div
        className={cn('flex flex-col w-64 h-screen top-0 border-r border-b border-white/5 bg-background shrink-0 fixed')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Logo provider="asius" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">connect</span>
          </Link>
        </div>

        <DeviceSelector />

        {device && (
          <div className="px-4 flex flex-col gap-1">
            <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">Menu</div>
            <Navigation />
          </div>
        )}

        {/* Bottom Section: Quick Actions & User */}
        <div className="p-4 flex flex-col gap-4 bg-background mt-auto">
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
