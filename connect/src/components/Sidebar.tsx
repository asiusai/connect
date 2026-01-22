import { Link } from 'react-router-dom'
import { api } from '../api'
import { Icon } from './Icon'
import { getDeviceName } from '../../../shared/types'
import { useState } from 'react'
import { Active, Devices } from '../pages/device/Devices'
import { Navigation } from '../pages/device/Navigation'
import { ActionBar } from '../pages/device/ActionBar'
import { useRouteParams } from '../utils/hooks'
import { Voltage } from '../pages/device/DevicesMobile'
import { IconButton } from './IconButton'
import { Logo } from '../../../shared/components/Logo'
import { isSignedIn } from '../utils/helpers'
import { cn } from '../../../shared/helpers'

export const Sidebar = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })
  const [profile] = api.auth.me.useQuery({ enabled: isSignedIn() })
  const [showDeviceList, setShowDeviceList] = useState(false)

  return (
    <div className="hidden md:flex w-64 h-full relative">
      <div className="flex flex-col w-64 h-screen top-0 border-r border-b border-white/5 bg-background shrink-0 fixed">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8" />
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
              <Icon
                name="keyboard_arrow_down"
                className={cn('text-white/60 group-hover:text-white transition-colors duration-200', showDeviceList && 'rotate-180')}
              />
            </div>

            {showDeviceList && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDeviceList(false)} />
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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

          {profile?.superuser && (
            <Link to="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary transition-colors text-primary-x">
              <Icon name="security" className="text-xl" />
              <span className="text-sm font-medium">Admin</span>
            </Link>
          )}

          {profile && (
            <div className="flex items-center justify-between px-2 pt-6 border-t border-white/5">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Signed in as</span>
                <span className="text-sm font-medium truncate text-white/90" title={profile.email ?? profile.id}>
                  {profile.email ?? profile.id}
                </span>
              </div>
              <IconButton
                href="/logout"
                className="p-2 -mr-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors text-xl aspect-square shrink-0"
                title="Log out"
                name="logout"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
