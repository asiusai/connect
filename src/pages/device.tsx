import clsx from 'clsx'

import { ButtonBase } from '../components/material/ButtonBase'
import { Icon } from '../components/material/Icon'
import { DeviceLocation } from '../components/DeviceLocation'

import { Loading } from '../components/material/Loading'
import { Device, getCommaName, getDeviceName } from '../types'
import { formatDistance, formatDuration } from '../utils/format'
import { useEffect, useState } from 'react'
import { useDevice, useDevices, useProfile, useRoutes, useStats } from '../api/queries'
import { storage } from '../utils/helpers'
import { useParams } from '../utils/hooks'
import { callAthena } from '../api/athena'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Slider } from '../components/material/Slider'

const timeAgo = (time: number): string => {
  const diff = Math.floor(Date.now() / 1000) - time

  if (diff < 120) return 'active now'

  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `active ${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `active ${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 365) return `active ${days}d ago`

  const years = Math.floor(days / 365)
  return `active ${years}y ago`
}

const DeviceList = ({ close }: { close: () => void }) => {
  const [devices] = useDevices()
  const navigate = useNavigate()
  const { dongleId } = useParams()

  const onSelect = (device: Device) => {
    close()
    storage.set('lastSelectedDongleId', device.dongle_id)
    navigate(`/${device.dongle_id}`)
  }

  return (
    <div className="flex flex-col w-full bg-background text-background-x animate-in slide-in-from-top-5 fade-in duration-200 overflow-hidden max-h-[60vh]">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <h2 className="text-lg font-bold">Switch Device</h2>
        <div className="p-2 -mr-2 cursor-pointer hover:bg-white/5 rounded-full" onClick={close}>
          <Icon name="close" className="text-xl" />
        </div>
      </div>

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

const Buttons = ({ dongleId }: { dongleId: string }) => {
  const [stats] = useStats(dongleId)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {[
        {
          title: 'Drives',
          subtitle: `${stats?.all.routes || 0} drives`,
          icon: 'directions_car',
          href: `/${dongleId}/routes`,
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
          title: 'Analyze',
          subtitle: 'See CAN data',
          icon: 'bar_chart',
          color: 'text-zinc-500',
        },
        {
          title: 'Settings',
          subtitle: 'Device config',
          icon: 'settings',
          href: `/${dongleId}/settings`,
          color: 'text-yellow-400',
        },
      ].map(({ title, href, icon, subtitle, color }) => (
        <ButtonBase
          key={title}
          href={href}
          disabled={!href}
          className={clsx(
            'flex flex-col gap-3 p-4 bg-background-alt text-left rounded-xl transition-all active:scale-[0.98]',
            href ? 'hover:bg-background-alt/80' : 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className={clsx('h-10 w-10 rounded-full flex items-center justify-center bg-white/5', color)}>
            <Icon name={icon as any} className="text-2xl" />
          </div>
          <div>
            <div className="text-lg font-medium text-white">{title}</div>
            {subtitle && <div className="text-xs text-white/60 font-medium">{subtitle}</div>}
          </div>
        </ButtonBase>
      ))}
    </div>
  )
}

const getBatteryColor = (value: number) => (value < 12.1 ? 'text-red-400' : value < 12.4 ? 'text-yellow-400' : 'text-green-400')

const UserMenu = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get('user') === 'true'
  const [profile] = useProfile()

  const toggleOpen = () => setSearchParams(!open ? { user: 'true' } : {})

  if (!profile) return null
  return (
    <div className="relative">
      <div
        className="flex items-center justify-center w-10 h-10 bg-background backdrop-blur-md rounded-full border border-white/10 cursor-pointer hover:bg-background/80 transition-colors"
        onClick={toggleOpen}
      >
        <Icon name="person" filled className="text-white" />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={toggleOpen} />
          <div className="absolute top-full right-0 mt-2 bg-background-alt border border-white/5 rounded-xl shadow-xl z-20 overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-200 p-1 flex flex-col gap-1">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Signed in as</span>
              <span className="text-sm font-medium truncate block text-white">{profile.email}</span>
            </div>
            <ButtonBase href="/logout" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-red-400 transition-colors">
              <Icon name="logout" className="text-lg" />
              <span className="font-medium text-sm">Log out</span>
            </ButtonBase>
          </div>
        </>
      )}
    </div>
  )
}

const Active = ({ device, className }: { device: Device; className?: string }) => {
  return (
    <p className={clsx(Math.floor(Date.now() / 1000) - device.last_athena_ping < 120 ? 'text-green-400' : 'text-white/70', className)}>
      {timeAgo(device.last_athena_ping)}
    </p>
  )
}

const ActionBar = () => {
  const { dongleId } = useParams()
  const icons = [
    { name: 'power_settings_new', label: 'Shutdown' },
    { name: 'home', label: 'Home' },
    { name: 'work', label: 'Work' },
    { name: 'camera', label: 'Snapshot', href: `/${dongleId}/sentry?instant=1` },
  ]
  return (
    <div className="flex items-center justify-center gap-6 px-4 pb-4">
      {icons.map(({ name, href }) => (
        <ButtonBase
          key={name}
          href={href}
          disabled={!href}
          className="flex pointer-events-auto items-center justify-center w-12 h-12 rounded-full bg-background-alt hover:bg-background shadow-md transition-all border border-white/5 active:scale-95"
        >
          <Icon name={name as any} className="text-white text-2xl" />
        </ButtonBase>
      ))}
    </div>
  )
}

const DetailRow = ({
  label,
  value,
  mono,
  copyable,
  href,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  copyable?: boolean
  href?: string
}) => {
  const [copied, setCopied] = useState(false)

  if (!value) return null

  const handleCopy = (e: React.MouseEvent) => {
    if (!copyable || typeof value !== 'string') return
    e.preventDefault()
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const content = (
    <div
      className={clsx(
        'flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-4',
        (copyable || href) && 'cursor-pointer hover:bg-white/5 -mx-2 px-2 transition-colors rounded-lg',
      )}
      onClick={copyable ? handleCopy : undefined}
    >
      <span className="text-sm text-white/60 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0 justify-end">
        <span className={clsx('font-medium text-white truncate', mono ? 'font-mono text-xs' : 'text-sm')}>{value}</span>
        {copyable && (
          <Icon
            name={copied ? 'check' : 'file_copy'}
            className={clsx('text-[14px] shrink-0', copied ? 'text-green-400' : 'text-white/20')}
          />
        )}
        {href && <Icon name="open_in_new" className="text-[14px] text-white/20 shrink-0" />}
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    )
  }

  return content
}

const Statistics = ({ dongleId }: { dongleId: string }) => {
  const [stats] = useStats(dongleId)
  const [timeRange, setTimeRange] = useState<'week' | 'all'>('all')

  if (!stats) return null

  const currentStats = stats[timeRange]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Statistics</h2>
        <Slider options={{ all: 'All time', week: 'This week' }} value={timeRange} onChange={setTimeRange} />
      </div>
      <div className="bg-background-alt rounded-xl px-4 py-3 flex flex-col">
        <DetailRow label="Distance" value={formatDistance(currentStats.distance)} />
        <DetailRow label="Time" value={formatDuration(currentStats.minutes)} />
        <DetailRow label="Drives" value={currentStats.routes.toString()} />
      </div>
    </div>
  )
}

const Info = ({ dongleId }: { dongleId: string }) => {
  const [routes] = useRoutes(dongleId, 1)
  const route = routes?.[0]
  return (
    <div className="flex flex-col gap-4 pb-10">
      <h2 className="text-xl font-bold px-2">Vehicle Info</h2>
      <div className="bg-background-alt rounded-xl px-4 py-3 flex flex-col">
        {!!route && (
          <>
            <DetailRow label="Repo" value={route.git_remote} href={route.git_remote ? `https://${route.git_remote}` : undefined} />
            <DetailRow label="Branch" value={route.git_branch} mono copyable />
            <DetailRow
              label="Commit"
              value={route.git_commit ? `${route.git_commit.slice(0, 7)} (${route.git_commit_date?.slice(0, 10) ?? '-'})` : undefined}
              mono
              copyable
            />
            <DetailRow label="Version" value={route.version} mono copyable />
            <DetailRow label="Make" value={route.make} copyable />
            <DetailRow label="Platform" value={route.platform} copyable />
            <DetailRow label="VIN" value={route.vin} mono copyable />
          </>
        )}
      </div>
    </div>
  )
}

export const Component = () => {
  const { dongleId } = useParams()
  const [device] = useDevice(dongleId)

  const [fade, setFade] = useState(1)
  const [battery, setBattery] = useState<number>()
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get('devices') === 'true'

  const setOpen = (newOpen: boolean) => setSearchParams(newOpen ? { devices: 'true' } : {})

  useEffect(() => {
    callAthena({ type: 'getMessage', dongleId, params: { service: 'peripheralState', timeout: 5000 } }).then((x) =>
      setBattery(x ? x.peripheralState.voltage / 1000 : undefined),
    )
  }, [])

  useEffect(() => {
    const onScroll = () => setFade(Math.max(0, 1 - window.scrollY / 300))

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!device) return <Loading className="h-screen w-screen" />
  return (
    <>
      <div className="fixed top-0 w-full h-[500px] overflow-hidden" style={{ opacity: fade }}>
        <div className="inset-x-0 top-0 flex items-start justify-between px-4 py-4 text-white absolute z-[999]">
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpen(true)}>
                <h1 className="text-2xl font-bold">{getDeviceName(device)}</h1>
                <Icon name="keyboard_arrow_down" className="drop-shadow-md" />
              </div>
              <div className="flex items-center gap-3 text-sm font-medium drop-shadow-md opacity-90">
                <Active device={device} />
                {battery && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    <div className={clsx('flex gap-1 items-center', getBatteryColor(battery))}>
                      <Icon name="battery_5_bar" className="rotate-90 !text-[18px]" />
                      <p>{battery.toFixed(1)}V</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <UserMenu />
          </div>
        </div>

        <DeviceLocation dongleId={dongleId} device={device} className="h-full w-full absolute" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none " />
        {fade !== 1 && (
          <div
            className="absolute inset-0 z-[999999]"
            onClick={(e) => {
              e.stopPropagation()
              document.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          ></div>
        )}
      </div>

      <div className="h-[430px] pointer-events-none"></div>
      <ActionBar />
      <div className="bg-background flex flex-col gap-6 shrink-0 p-6 w-full relative">
        <Buttons dongleId={dongleId} />
        <Statistics dongleId={dongleId} />
        <Info dongleId={dongleId} />
      </div>

      {open && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute top-0 left-0 w-full bg-surface rounded-b-3xl shadow-2xl overflow-hidden">
            <DeviceList close={() => setOpen(false)} />
          </div>
          <div className="absolute inset-0 z-[-1]" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
