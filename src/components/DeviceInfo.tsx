import clsx from 'clsx'

import { useDrawerContext } from '~/components/material/Drawer'
import { Icon } from '~/components/material/Icon'
import { IconButton } from '~/components/material/IconButton'
import { DeviceLocation } from '~/components/DeviceLocation'

import { RouteList } from './RouteList'
import { api } from '~/api'
import { Loading } from './material/Loading'
import { Device, getDeviceName } from '~/api/types'
import { formatDistance, formatDuration } from '~/utils/format'

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

export const DeviceInfo = ({ dongleId }: { dongleId: string }) => {
  const res = useDevice(dongleId)
  const device = res.data?.body

  if (!device) return <Loading className="h-screen w-screen" />
  return (
    <>
      <div className="fixed top-0 w-full h-[500px]">
        <Top device={device} />
        <DeviceLocation dongleId={dongleId} device={device} className="h-full w-full" />
      </div>
      <div className="relative pointer-events-none min-h-screen">
        <div className="h-[430px]"></div>
        <ActionBar />
        <div className="bg-surface-container-low p-4 rounded-t-xl flex flex-col gap-4 pointer-events-auto h-full">
          <RouteList dongleId={dongleId} />
          <DeviceStatistics dongleId={dongleId} device={device} />
        </div>
      </div>
    </>
  )
}

const Top = ({ device }: { device: Device }) => {
  const { modal, setOpen } = useDrawerContext()
  return (
    <div className="inset-x-0 top-0 flex items-center gap-4 px-5 py-5 text-on-surface fixed z-[999]">
      <h1 className="grow truncate text-title-lg font-bold">
        <div onClick={() => setOpen(true)}>
          <div className="flex items-center gap-2">
            <p>{device.name || 'connect'}</p>
            {modal && <Icon name="keyboard_arrow_down" className="" />}
          </div>
          <p
            className={clsx(
              'text-xs',
              Math.floor(Date.now() / 1000) - device.last_athena_ping < 120 ? 'text-green-400' : 'text-on-surface-variant',
            )}
          >
            {timeAgo(device.last_athena_ping)}
          </p>
        </div>
      </h1>
      <div className="flex gap-4">
        <IconButton name="camera" onClick={() => alert('TODO')} />
        <IconButton name="settings" href={`/${device.dongle_id}/settings`} />
      </div>
    </div>
  )
}

const ActionBar = () => {
  const icons = [
    { name: 'pause', onClick: () => alert('TODO') },
    { name: 'add', onClick: () => alert('TODO') },
    { name: 'camera', onClick: () => alert('TODO') },
    { name: 'directions_car', onClick: () => alert('TODO') },
  ]
  return (
    <div className="flex justify-around items-center h-[50px]">
      {icons.map(({ name, onClick }) => (
        <div
          key={name}
          onClick={onClick}
          className="bg-surface-container-low shadow-lg p-2 rounded-full pointer-events-auto cursor-pointer"
        >
          <Icon name={name as any} className="" />
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
      <p className="text-2xl font-bold text-title-lg">{getDeviceName(device)}</p>

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
        <div className="grid grid-cols-2">
          {[
            { title: 'All time', stats: stats.all },
            { title: 'Weekly', stats: stats.week },
          ].map(({ title, stats }) => (
            <div className="flex flex-col">
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
    </>
  )
}
