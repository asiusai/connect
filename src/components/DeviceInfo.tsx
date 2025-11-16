import clsx from 'clsx'

import { useDrawerContext } from '~/components/material/Drawer'
import { Icon } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { DeviceLocation } from '~/components/DeviceLocation'

import { api } from '~/api'
import { Loading } from './material/Loading'
import { Device, getDeviceName } from '~/api/types'
import { formatDistance, formatDuration } from '~/utils/format'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

export const useDevice = (dongleId: string) =>
  api.devices.get.useQuery({ queryKey: ['device', dongleId], queryData: { params: { dongleId } } })

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
  const res = useDevice(dongleId)
  const device = res.data?.body
  const stats = api.devices.stats.useQuery({ queryKey: ['stats', dongleId], queryData: { params: { dongleId } } })

  const [fade, setFade] = useState(1)

  useEffect(() => {
    const el = document.querySelector('#left')!
    const onScroll = () => setFade(Math.max(0, 1 - el.scrollTop / 400))
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  if (!device) return <Loading className="h-screen w-screen" />
  console.log(fade)
  return (
    <>
      <div className="fixed top-0 w-full h-[500px]" style={{ opacity: fade }}>
        <Top device={device} />
        <DeviceLocation dongleId={dongleId} device={device} className="h-full w-full relative" />
        {fade !== 1 && (
          <div
            className="absolute top-0 h-full w-full z-[999999]"
            onClick={(e) => {
              e.stopPropagation()
              document.querySelector('#left')!.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          ></div>
        )}
      </div>
      <div className="relative pointer-events-none min-h-screen">
        <div className="h-[430px]"></div>
        <ActionBar />
        <div className="bg-surface-container-low p-4 rounded-t-xl flex flex-col gap-4 pointer-events-auto h-full">
          <div className="flex flex-col gap-4">
            {[
              { title: 'Drives', subtitle: `${stats.data?.body.all.routes} drives`, icon: 'directions_car', href: `/${dongleId}/routes` },
              { title: 'Sentry mode', subtitle, icon: 'photo_camera' },
              { title: 'Actions', subtitle, icon: 'infrared' },
              { title: 'Teleop', subtitle, icon: 'gamepad' },
              { title: 'Analyze', subtitle, icon: 'bar_chart' },
              { title: 'Settings', icon: 'settings', href: `/${dongleId}/settings` },
            ].map(({ title, href, icon, subtitle }) => (
              <Link key={title} to={href || ''} className="flex items-center gap-4 px-2 text-lg h-14">
                <Icon name={icon as any} className="opacity-50" />
                <div className="mr-auto flex flex-col gap-0.5">
                  <div className="text-white">{title}</div>
                  {subtitle && <div className="text-xs opacity-50">{subtitle}</div>}
                </div>
                <Icon name="keyboard_arrow_down" className="-rotate-90 opacity-20" />
              </Link>
            ))}
          </div>

          {/* <RouteList dongleId={dongleId} /> */}
          <DeviceStatistics dongleId={dongleId} device={device} />
        </div>
      </div>
    </>
  )
}

const getBatteryColor = (value: number) => {
  if (value < 12.1) return 'text-red-500'
  if (value < 12.5) return 'text-yellow-500'
  else 'text-green-500'
}

const Top = ({ device }: { device: Device }) => {
  const { modal, setOpen } = useDrawerContext()
  // TODO: get battery
  const battery = 12.8
  return (
    <div className="inset-x-0 top-0 flex items-center gap-4 px-5 py-5 text-on-surface fixed z-[999]">
      <div className="grow truncate text-title-lg font-bold">
        <div onClick={() => setOpen(true)}>
          <div className="flex items-center gap-2">
            <p>{device.name || 'connect'}</p>
            {modal && <Icon name="keyboard_arrow_down" className="-rotate-90" />}
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
      <div
        onClick={() => alert('Navigate on OP')}
        className="items-center flex bg-surface-container shadow-md shadow-white/20 px-3 py-2 gap-3 rounded-lg"
      >
        <div>Navigate</div>
        <Icon name="search" className="" />
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
        <div key={name} onClick={onClick}>
          <Icon name={name as any} className="text-white font-bold scale-[1.1]" />
        </div>
      ))}
    </div>
  )
}

const DeviceStatistics = ({ dongleId, device }: { device: Device; dongleId: string }) => {
  const data = api.devices.stats.useQuery({ queryKey: ['stats', dongleId], queryData: { params: { dongleId } } })
  const stats = data.data?.body
  const routes = api.routes.allRoutes.useQuery({
    queryKey: ['allRoutes', dongleId],
    queryData: { params: { dongleId }, query: { limit: 1 } },
  })
  const route = routes.data?.body[0]
  if (!stats) return null
  return (
    <>
      <p className="text-2xl font-bold text-title-lg mt-4">{getDeviceName(device)}</p>

      <div className="flex flex-col gap-1">
        {!!route &&
          [
            { label: 'Repo', value: route.git_remote ? <a href={route.git_remote}>{route.git_remote}</a> : undefined },
            { label: 'Branch', value: route.git_branch },
            {
              label: 'Commit',
              value: route.git_commit ? `${route.git_commit.slice(0, 7)} (${route.git_commit_date!.slice(0, 10)})` : undefined,
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
    </>
  )
}
