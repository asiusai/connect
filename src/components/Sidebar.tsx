import { Link, useParams } from 'react-router-dom'
import { useDevice, useProfile, useStats } from '../api/queries'
import { Icon } from './Icon'
import clsx from 'clsx'
import { ButtonBase } from './ButtonBase'
import { getDeviceName } from '../types'
import { useState } from 'react'
import { DrivingStatistics } from '../types'
import { useNavigate } from 'react-router-dom'
import { useDevices } from '../api/queries'
import { Device, getCommaName } from '../types'
import { storage } from '../utils/helpers'
import { timeAgo } from '../utils/format'

const getNavItems = (dongleId: string, stats?: DrivingStatistics) => [
  {
    title: 'Home',
    subtitle: `${stats?.all.routes || 0} drives`,
    icon: 'home',
    href: `/${dongleId}`,
    color: 'text-blue-400',
  },
  {
    title: 'Sentry',
    subtitle: 'View clips',
    icon: 'photo_camera',
    href: `/${dongleId}/sentry`,
    color: 'text-red-400',
  },
  {
    title: 'Actions',
    subtitle: 'Trigger controls',
    icon: 'infrared',
    color: 'text-zinc-500',
  },
  {
    title: 'Teleop',
    subtitle: 'Remote control',
    icon: 'gamepad',
    color: 'text-zinc-500',
  },
  {
    title: 'Settings',
    subtitle: 'Device config',
    icon: 'settings',
    href: `/${dongleId}/settings`,
    color: 'text-yellow-400',
  },
]

const getActionItems = (dongleId: string) => [
  { name: 'power_settings_new', label: 'Shutdown' },
  { name: 'home', label: 'Home' },
  { name: 'work', label: 'Work' },
  { name: 'camera', label: 'Snapshot', href: `/${dongleId}/sentry?instant=1` },
]

export const Active = ({ device, className }: { device: Device; className?: string }) => {
  return (
    <p className={clsx(Math.floor(Date.now() / 1000) - device.last_athena_ping < 120 ? 'text-green-400' : 'text-white/70', className)}>
      {timeAgo(device.last_athena_ping)}
    </p>
  )
}

export const DeviceList = ({ close, isDropdown }: { close: () => void; isDropdown?: boolean }) => {
  const [devices] = useDevices()
  const navigate = useNavigate()
  const { dongleId } = useParams()

  const onSelect = (device: Device) => {
    close()
    storage.set('lastSelectedDongleId', device.dongle_id)
    navigate(`/${device.dongle_id}`)
  }

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
            onClick={() => onSelect(device)}
          >
            <div className="flex flex-col gap-0.5 z-10">
              <span className="text-sm font-bold text-white">{getDeviceName(device)}</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/60">{getCommaName(device)}</span>
                <span className="text-white/40">•</span>
                <Active device={device} className="text-xs" />
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

export const Sidebar = () => {
  const { dongleId } = useParams()
  const [device] = useDevice(dongleId || '')
  const [stats] = useStats(dongleId || '')
  const [profile] = useProfile()
  const [showDeviceList, setShowDeviceList] = useState(false)

  const navItems = getNavItems(dongleId || '', stats)
  const actionItems = getActionItems(dongleId || '')

  return (
    <div className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-white/5 bg-background shrink-0">
      {/* App Logo / Home */}
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/images/comma-white.svg" alt="connect" className="w-8 h-8 rounded-full" />
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
              <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">Current Device</span>
              <span className="font-bold truncate">{device ? getDeviceName(device) : 'Select Device'}</span>
            </div>
            <Icon
              name="keyboard_arrow_down"
              className={clsx('text-white/60 group-hover:text-white transition-colors duration-200', showDeviceList && 'rotate-180')}
            />
          </div>

          {showDeviceList && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDeviceList(false)} />
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <DeviceList close={() => setShowDeviceList(false)} isDropdown />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-1">
        <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-2">Menu</div>
        {navItems.map((item) => (
          <ButtonBase
            key={item.title}
            href={item.href}
            disabled={!item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
              item.href ? 'hover:bg-white/10 text-white' : 'opacity-50 cursor-not-allowed text-white/60',
            )}
          >
            <Icon name={item.icon as any} className={clsx('text-lg', item.color)} />
            <span>{item.title}</span>
          </ButtonBase>
        ))}
      </div>

      {/* Bottom Section: Quick Actions & User */}
      <div className="p-4 flex flex-col gap-6 bg-background">
        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2">
            {actionItems.map((item) => (
              <ButtonBase
                key={item.name}
                href={item.href}
                className="flex items-center justify-center aspect-square rounded-lg bg-background-alt hover:bg-white/10 transition-colors border border-white/5 text-white/80 hover:text-white"
                title={item.label}
              >
                <Icon name={item.name as any} className="text-xl" />
              </ButtonBase>
            ))}
          </div>
        </div>

        {/* User Profile */}
        {profile && (
          <div className="flex items-center justify-between px-2 pt-6 border-t border-white/5">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Signed in as</span>
              <span className="text-sm font-medium truncate text-white/90" title={profile.email}>
                {profile.email}
              </span>
            </div>
            <ButtonBase
              href="/logout"
              className="p-2 -mr-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Log out"
            >
              <Icon name="logout" className="text-xl" />
            </ButtonBase>
          </div>
        )}
      </div>
    </div>
  )
}
