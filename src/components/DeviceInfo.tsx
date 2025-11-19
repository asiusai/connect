import clsx from 'clsx'

import { useDrawerContext } from '../components/material/Drawer'
import { ButtonBase } from '../components/material/ButtonBase'
import { Icon } from '../components/material/Icon'
import { DeviceLocation } from '../components/DeviceLocation'

import { Loading } from './material/Loading'
import { Device, getDeviceName } from '../types'
import { formatDistance, formatDuration } from '../utils/format'
import { useEffect, useRef, useState } from 'react'
import { useDevice, useRoutes, useStats } from '../api/queries'
import { useDongleId } from '../utils/hooks'
import { callAthena } from '../api/athena'
import { useNavigate } from 'react-router-dom'
import { Toggle } from './material/Toggle'

const timeAgo = (time: number): string => {
  const diff = Math.floor(Date.now() / 1000) - time

  if (diff < 120) return 'active now'

  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `active ${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `active ${hours}h ago`

  const days = Math.floor(hours / 24)
  return `active ${days}d ago`
}

export const DeviceInfo = ({ dongleId }: { dongleId: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [device] = useDevice(dongleId)
  const [stats] = useStats(dongleId)

  const [fade, setFade] = useState(1)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setFade(Math.max(0, 1 - el.scrollTop / 300))
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRef.current])

  if (!device) return <Loading className="h-screen w-screen" />
  return (
    <div className="min-w-full h-full relative overflow-hidden bg-surface">
      <div className="absolute w-full h-[550px]" style={{ opacity: fade }}>
        <Top device={device} />
        <DeviceLocation dongleId={dongleId} device={device} className="h-full w-full absolute" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        {fade !== 1 && (
          <div
            className="absolute top-0 h-full w-full z-[999999]"
            onClick={(e) => {
              e.stopPropagation()
              scrollRef.current!.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          ></div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="relative pointer-events-none min-h-screen overflow-y-scroll w-full min-h-full h-full z-[9999] flex flex-col pt-[40vh]"
      >
        <div className="pointer-events-auto px-4 pb-4">
          <ActionBar />
        </div>
        <div className="bg-surface rounded-t-3xl overflow-hidden flex flex-col gap-6 pointer-events-auto min-h-full shrink-0 shadow-xl p-6">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                {
                  title: 'Drives',
                  subtitle: `${stats?.all.routes || 0} drives`,
                  icon: 'directions_car',
                  href: `/${dongleId}/routes`,
                  color: 'bg-blue-500/10 text-blue-400',
                },
                {
                  title: 'Sentry',
                  subtitle: 'View clips',
                  icon: 'photo_camera',
                  href: `/${dongleId}/sentry`,
                  color: 'bg-red-500/10 text-red-400',
                },
                {
                  title: 'Actions',
                  subtitle: 'Trigger controls',
                  icon: 'infrared',
                  color: 'bg-zinc-500/10 text-zinc-500',
                },
                {
                  title: 'Teleop',
                  subtitle: 'Remote control',
                  icon: 'gamepad',
                  color: 'bg-zinc-500/10 text-zinc-500',
                },
                {
                  title: 'Analyze',
                  subtitle: 'See CAN data',
                  icon: 'bar_chart',
                  color: 'bg-zinc-500/10 text-zinc-500',
                },
                {
                  title: 'Settings',
                  subtitle: 'Device config',
                  icon: 'settings',
                  href: `/${dongleId}/settings`,
                  color: 'bg-zinc-500/10 text-zinc-400',
                },
              ].map(({ title, href, icon, subtitle, color }) => (
                <ButtonBase
                  key={title}
                  href={href}
                  disabled={!href}
                  className={clsx(
                    'flex flex-col gap-3 p-4 rounded-2xl bg-surface-container-low transition-colors text-left',
                    href ? 'hover:bg-surface-container' : 'opacity-50',
                  )}
                >
                  <div className={clsx('p-2 rounded-xl w-fit', color)}>
                    <Icon name={icon as any} size="24" />
                  </div>
                  <div>
                    <div className="text-title-md font-medium">{title}</div>
                    {subtitle && <div className="text-body-sm text-on-surface-variant">{subtitle}</div>}
                  </div>
                </ButtonBase>
              ))}
            </div>
          </div>

          <DeviceStatistics dongleId={dongleId} />
        </div>
      </div>
    </div>
  )
}

const getBatteryColor = (value: number) => (value < 12.1 ? 'text-red-400' : value < 12.5 ? 'text-yellow-400' : 'text-green-400')

const Top = ({ device }: { device: Device }) => {
  const dongleId = useDongleId()
  const { modal, setOpen } = useDrawerContext()
  const [battery, setBattery] = useState<number>()

  useEffect(() => {
    callAthena({ type: 'getMessage', dongleId, params: { service: 'peripheralState', timeout: 5000 } }).then((x) =>
      setBattery(x ? x.peripheralState.voltage / 1000 : undefined),
    )
  }, [])

  return (
    <div className="inset-x-0 top-0 flex items-center justify-between px-6 py-6 text-white absolute z-[999]">
      <div className="flex items-center gap-3" onClick={() => setOpen(true)}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 cursor-pointer">
            <h1 className="text-headline-sm font-bold drop-shadow-md">{device.name || 'connect'}</h1>
            {modal && <Icon name="keyboard_arrow_down" className="drop-shadow-md" />}
          </div>
          <div className="flex items-center gap-3 text-label-md font-medium drop-shadow-md opacity-90">
            <p className={clsx(Math.floor(Date.now() / 1000) - device.last_athena_ping < 120 ? 'text-green-400' : 'text-white/70')}>
              {timeAgo(device.last_athena_ping)}
            </p>
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
      </div>
    </div>
  )
}

const ActionBar = () => {
  const dongleId = useDongleId()
  const navigate = useNavigate()
  const icons = [
    { name: 'power_settings_new', label: 'Shutdown', onClick: () => alert('Shut comma down to save battery') },
    { name: 'home', label: 'Home', onClick: () => alert('Navigate to home') },
    { name: 'work', label: 'Work', onClick: () => alert('Navigate to work') },
    {
      name: 'camera',
      label: 'Snapshot',
      onClick: () => {
        navigate(`/${dongleId}/sentry?instant=1`)
      },
    },
  ]
  return (
    <div className="flex items-center justify-center gap-6">
      {icons.map(({ name, onClick }) => (
        <ButtonBase
          key={name}
          onClick={onClick}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-low hover:bg-surface-container shadow-md transition-all border border-white/5"
        >
          <Icon name={name as any} className="text-on-surface" size="24" />
        </ButtonBase>
      ))}
    </div>
  )
}
const DeviceStatistics = ({ dongleId }: { dongleId: string }) => {
  const [stats] = useStats(dongleId)
  const [routes] = useRoutes(dongleId, 1)
  const [timeRange, setTimeRange] = useState<'week' | 'all'>('all')
  const route = routes?.[0]

  if (!stats) return null

  const currentStats = stats[timeRange]
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-title-lg font-bold">Statistics</h2>
          <Toggle options={{ all: 'All time', week: 'This week' }} value={timeRange} onChange={setTimeRange} />
        </div>
        <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-headline-sm font-bold">{formatDistance(currentStats.distance)}</span>
              <span className="text-label-sm text-on-surface-variant">Distance</span>
            </div>
            <div className="flex flex-col">
              <span className="text-title-md font-bold">{formatDuration(currentStats.minutes)}</span>
              <span className="text-label-sm text-on-surface-variant">Time</span>
            </div>
            <div className="flex flex-col">
              <span className="text-title-md font-bold">{currentStats.routes}</span>
              <span className="text-label-sm text-on-surface-variant">Drives</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-title-lg font-bold px-2">Vehicle Info</h2>
        <div className="bg-surface-container-low rounded-2xl p-1 overflow-hidden">
          {!!route &&
            [
              {
                label: 'Repo',
                value: route.git_remote ? (
                  <a href={route.git_remote} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {route.git_remote}
                  </a>
                ) : undefined,
              },
              { label: 'Branch', value: route.git_branch },
              {
                label: 'Commit',
                value: route.git_commit ? `${route.git_commit.slice(0, 7)} (${route.git_commit_date?.slice(0, 10) ?? '-'})` : undefined,
              },
              { label: 'Version', value: route.version },
              { label: 'Make', value: route.make },
              { label: 'Platform', value: route.platform },
              { label: 'VIN', value: route.vin },
            ]
              .filter((x) => x.value)
              .map(({ label, value }, i, arr) => (
                <div
                  key={label}
                  className={clsx(
                    'flex justify-between items-center p-4 hover:bg-surface-container transition-colors',
                    i !== arr.length - 1 && 'border-b border-outline-variant/50',
                  )}
                >
                  <span className="text-on-surface-variant text-sm">{label}</span>
                  <span className="font-medium text-sm text-right truncate max-w-[60%]">{value}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
