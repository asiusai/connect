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

const timeAgo = (time: number): string => {
  const diff = Math.floor(Date.now() / 1000) - time

  if (diff < 120) return 'active now'

  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `active ${minutes} minutes ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `active ${hours} hours ago`

  const days = Math.floor(hours / 24)
  return `active ${days} days ago`
}

const subtitle = 'Coming soon'
export const DeviceInfo = ({ dongleId }: { dongleId: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [device] = useDevice(dongleId)
  const [stats] = useStats(dongleId)

  const [fade, setFade] = useState(1)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setFade(Math.max(0, 1 - el.scrollTop / 400))
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRef.current])

  if (!device) return <Loading className="h-screen w-screen" />
  return (
    <div className="min-w-full h-full relative overflow-hidden">
      <div className="absolute w-full h-[500px]" style={{ opacity: fade }}>
        <Top device={device} />
        <DeviceLocation dongleId={dongleId} device={device} className="h-full w-full absolute" />
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
        className="relative pointer-events-none min-h-screen overflow-y-scroll w-full min-h-full h-full z-[9999] flex flex-col pt-[430px]"
      >
        <ActionBar />
        <div className="bg-surface-container-low rounded-t-xl  overflow-hidden flex flex-col gap-4 pointer-events-auto min-h-full shrink-0">
          <div className="flex flex-col">
            {[
              { title: 'Drives', subtitle: `${stats?.all.routes || 0} drives`, icon: 'directions_car', href: `/${dongleId}/routes` },
              { title: 'Sentry mode', subtitle, icon: 'photo_camera' },
              { title: 'Actions', subtitle, icon: 'infrared' },
              { title: 'Teleop', subtitle, icon: 'gamepad' },
              { title: 'Analyze', subtitle, icon: 'bar_chart' },
              { title: 'Settings', icon: 'settings', href: `/${dongleId}/settings` },
            ].map(({ title, href, icon, subtitle }) => (
              <ButtonBase key={title} href={href} className="flex items-center gap-4 text-lg h-14 hover:bg-surface-container px-6 py-10">
                <Icon name={icon as any} className="opacity-50" />
                <div className="mr-auto flex flex-col gap-0.5">
                  <div className="text-white">{title}</div>
                  {subtitle && <div className="text-xs opacity-50">{subtitle}</div>}
                </div>
                <Icon name="keyboard_arrow_right" className="opacity-20" />
              </ButtonBase>
            ))}
          </div>
          <DeviceStatistics dongleId={dongleId} device={device} />
        </div>
      </div>
    </div>
  )
}

const getBatteryColor = (value: number) => (value < 12.1 ? 'text-red-500' : value < 12.5 ? 'text-yellow-500' : 'text-green-500')

const Top = ({ device }: { device: Device }) => {
  const { modal, setOpen } = useDrawerContext()
  // TODO: get battery
  const battery = 12.8
  return (
    <div className="inset-x-0 top-0 flex items-center gap-4 px-5 py-5 text-on-surface absolute z-[999]">
      <div className="grow truncate text-title-lg font-bold">
        <div onClick={() => setOpen(true)}>
          <div className="flex items-center gap-2">
            <p>{device.name || 'connect'}</p>
            {modal && <Icon name="keyboard_arrow_right" className="" />}
          </div>
          {battery && (
            <div className={clsx('flex gap-2 items-center', getBatteryColor(battery))}>
              <Icon name="battery_5_bar" className="rotate-90" />
              <p className="text-xs">{battery.toFixed(1)}V</p>
            </div>
          )}
          <p
            className={clsx(
              'text-xs',
              Math.floor(Date.now() / 1000) - device.last_athena_ping < 120 ? 'text-green-400' : 'text-on-surface-variant',
            )}
          >
            {timeAgo(device.last_athena_ping)}
          </p>
        </div>
      </div>
    </div>
  )
}

const ActionBar = () => {
  const icons = [
    { name: 'power_settings_new', onClick: () => alert('Shut down') },
    { name: 'home', onClick: () => alert('Drive home') },
    { name: 'work', onClick: () => alert('Drive work') },
    { name: 'camera', onClick: () => alert('Take a snapshot') },
  ]
  return (
    <div className="flex justify-around items-center h-[50px] px-4">
      {icons.map(({ name, onClick }) => (
        <ButtonBase key={name} onClick={onClick} className="p-2 rounded-full bg-surface-container-low hover:bg-surface-container">
          <Icon name={name as any} className="text-white font-bold pointer-events-auto" />
        </ButtonBase>
      ))}
    </div>
  )
}

const DeviceStatistics = ({ dongleId, device }: { device: Device; dongleId: string }) => {
  const [stats] = useStats(dongleId)
  const [routes] = useRoutes(dongleId, 1)
  const route = routes?.[0]
  if (!stats) return null
  return (
    <div className="flex flex-col p-4 gap-4">
      <p className="text-2xl font-bold text-title-lg">{getDeviceName(device)}</p>

      <div className="flex flex-col gap-1">
        {!!route &&
          [
            { label: 'Repo', value: route.git_remote ? <a href={route.git_remote}>{route.git_remote}</a> : undefined },
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
            .map(({ label, value }) => (
              <div key={label} className="flex gap-2 text-sm">
                <p className="">{label}:</p>
                <p className="text-on-surface-variant">{value}</p>
              </div>
            ))}
      </div>
      <div className="grid grid-cols-2">
        {[
          { title: 'All time', stats: stats.all },
          { title: 'Weekly', stats: stats.week },
        ].map(({ title, stats }) => (
          <div key={title} className="flex flex-col">
            <p className="text-sm">{title}:</p>
            {[
              { label: 'Distance', value: formatDistance(stats.distance) },
              { label: 'Duration', value: formatDuration(stats.minutes) },
              { label: 'Routes', value: stats.routes },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-2 text-xs text-on-surface-variant">
                <p>{label}:</p>
                <p>{value}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
