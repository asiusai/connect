import clsx from 'clsx'

import { ButtonBase } from '../components/ButtonBase'
import { Icon } from '../components/Icon'
import { Loading } from '../components/Loading'
import { Device, getDeviceName } from '../types'
import { dateTimeToColorBetween, formatDistance, formatDuration } from '../utils/format'
import { useEffect, useState } from 'react'
import { useDevice, useRoutes, useStats } from '../api/queries'
import { callAthena } from '../api/athena'
import { useParams, useSearchParams } from 'react-router-dom'
import { Slider } from '../components/Slider'
import { useProfile } from '../api/queries'
import type { IconName } from '../components/Icon'
import { getFullAddress, getTileUrl } from '../utils/map'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { useDeviceLocation } from '../api/queries'
import { useCallback } from '../../build/bundle'
import { IconButton } from '../components/IconButton'
import { Active, DeviceList } from '../components/Sidebar'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { Fragment } from 'react'
import { api } from '../api'
import { usePreservedRoutes } from '../api/queries'
import { Route } from '../types'
import { Link } from 'react-router-dom'
import { getPlaceName } from '../utils/map'
import { Button } from '../components/Button'

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
            <ButtonBase
              href="/logout"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-red-400 transition-colors"
            >
              <Icon name="logout" className="text-lg" />
              <span className="font-medium text-sm">Log out</span>
            </ButtonBase>
          </div>
        </>
      )}
    </div>
  )
}

const Buttons = ({ dongleId }: { dongleId: string }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {[
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

const ActionBar = () => {
  const { dongleId } = useParams()
  const icons: { name: string; label: string; href?: string }[] = [
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
        <Slider options={{ all: 'All', week: 'Weekly' }} value={timeRange} onChange={setTimeRange} />
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

type Location = {
  lat: number
  lng: number
  label: string
  address: string | null
  iconName: IconName
  iconClass?: string
}

const SAN_DIEGO: [number, number] = [32.711483, -117.161052]

const usePosition = () => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)

  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(setPosition, (err) => {
      console.log("Error getting user's position", err)
      setPosition(null)
    })
  }, [])

  useEffect(() => {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        permission.addEventListener('change', requestPosition)

        if (permission.state === 'granted') requestPosition()
      })
      .catch(() => setPosition(null))
  }, [requestPosition])
  return { position, requestPosition }
}

const FitBounds = ({ markers }: { markers: Location[] }) => {
  const map = useMap()
  useEffect(() => {
    if (!markers.length) return

    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [50, 50], animate: true })
  }, [markers, map])

  return null
}

export const DeviceLocation = ({ dongleId, device, className }: { dongleId: string; device: Device; className?: string }) => {
  const { position, requestPosition } = usePosition()
  const [markers, setMarkers] = useState<Location[]>([])
  const [location] = useDeviceLocation(dongleId)

  useEffect(() => {
    const effect = async () => {
      const markers: Location[] = []
      if (location) {
        markers.push({
          address: await getFullAddress([location.lng, location.lat]),
          lat: location.lat,
          lng: location.lng,
          label: getDeviceName(device),
          iconName: 'directions_car',
        })
      }
      if (position) {
        markers.push({
          address: await getFullAddress([position.coords.longitude, position.coords.latitude]),
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'You',
          iconName: 'person',
          iconClass: 'bg-primary',
        })
      }
      setMarkers(markers)
    }
    effect()
  }, [position, device, location])

  return (
    <div className={clsx(className)}>
      <MapContainer
        attributionControl={false}
        zoomControl={false}
        center={SAN_DIEGO}
        zoom={10}
        className="h-full w-full !bg-background-alt"
      >
        <TileLayer url={getTileUrl()} />

        {markers.map((x) => (
          <Marker
            key={x.iconName}
            position={[x.lat, x.lng]}
            eventHandlers={{
              click: () => {
                window.open(`https://www.google.com/maps?q=${x!.lat},${x!.lng}`, '_blank')
              },
            }}
            icon={L.divIcon({
              className: 'border-none bg-none',
              html: `<div class="flex size-[40px] items-center justify-center rounded-full bg-primary-alt ${x.iconClass}"><span class="material-symbols-outlined flex icon-outline">${x.iconName}</span></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          />
        ))}
        <FitBounds markers={markers} />
      </MapContainer>
      {!position && (
        <IconButton
          name="my_location"
          title="Request location"
          className="absolute bottom-4 right-2 bg-background p-2 z-[999]"
          onClick={() => requestPosition()}
        />
      )}
      {!markers.length && (
        <div className="absolute left-1/2 top-1/2 z-[5000] flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-background-alt px-4 py-2 shadow">
          <div className="mr-2 size-4 animate-spin rounded-full border-2 border-background-alt-x border-t-transparent" />
          <span className="text-sm">Locating...</span>
        </div>
      )}
    </div>
  )
}

dayjs.extend(utc)
dayjs.extend(timezone)

const PAGE_SIZE = 10

const getDayHeader = (route: Route) => {
  const date = dayjs.utc(route.start_time).local()
  if (date.isSame(dayjs(), 'day')) return `Today – ${date.format('dddd, MMM D')}`
  else if (date.isSame(dayjs().subtract(1, 'day'), 'day')) return `Yesterday – ${date.format('dddd, MMM D')}`
  else if (date.year() === dayjs().year()) return date.format('dddd, MMM D')
  else return date.format('dddd, MMM D, YYYY')
}

const getLocation = async (route: Route) => {
  const startPos = [route.start_lng || 0, route.start_lat || 0]
  const endPos = [route.end_lng || 0, route.end_lat || 0]
  const startPlace = await getPlaceName(startPos)
  const endPlace = await getPlaceName(endPos)
  if (!startPlace && !endPlace) return ''
  if (!endPlace || startPlace === endPlace) return startPlace
  if (!startPlace) return endPlace
  return `${startPlace} to ${endPlace}`
}

const RouteCard = ({ route }: { route: Route }) => {
  const startTime = dayjs.utc(route.start_time).local()
  const endTime = dayjs.utc(route.end_time).local()
  const color = dateTimeToColorBetween(startTime.toDate(), endTime.toDate(), [30, 57, 138], [218, 161, 28])

  const [location, setLocation] = useState<string | null>(null)
  useEffect(() => void getLocation(route).then(setLocation), [route])

  const duration = endTime.diff(startTime)
  const durationStr = formatDuration(duration / (60 * 1000))
  const distanceStr = formatDistance(route.distance)

  return (
    <Link
      to={`/${route.dongle_id}/routes/${route.fullname.slice(17)}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl bg-background-alt p-4 shadow-sm transition-all hover:bg-background-alt/80 active:scale-[0.99]"
    >
      {/* Color Indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />

      <div className="flex flex-col gap-1 pl-3">
        {/* Time and Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <span>{startTime.format('h:mm A')}</span>
            <span className="text-white/40 text-sm font-normal">•</span>
            <span>{endTime.format('h:mm A')}</span>
          </div>
          <div className="text-xs font-medium text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{durationStr}</div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 min-h-[24px]">
          <Icon name="location_on" className="mt-0.5 text-[16px] text-white/40 shrink-0" />
          <span className="text-sm font-medium text-white/80 leading-snug line-clamp-2">{location || 'Loading location...'}</span>
        </div>

        {/* Footer / Stats */}
        <div className="mt-2 flex items-center gap-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5">
            <Icon name="directions_car" className="text-[16px] text-white/40" />
            <span className="text-xs font-medium text-white/70">{distanceStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name={route.is_public ? 'public' : 'public_off'} className="text-[16px] text-white/40" />
            <span className="text-xs font-medium text-white/70">{route.is_public ? 'Public' : 'Private'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export const DriveList = ({ dongleId, className }: { dongleId: string; className?: string }) => {
  const [preserved] = usePreservedRoutes(dongleId)
  const query = api.routes.allRoutes.useInfiniteQuery({
    queryKey: ['allRoutes', dongleId],
    queryData: ({ pageParam }) => ({ query: pageParam as any, params: { dongleId } }),
    initialPageParam: { created_before: undefined, limit: PAGE_SIZE },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.body.length !== PAGE_SIZE) return undefined
      return { created_before: lastPage.body[lastPage.body.length - 1].create_time, limit: PAGE_SIZE }
    },
  })

  let prevDayHeader: string | null = null

  const [params, setParams] = useSearchParams()
  const show = params.has('preserved') ? 'preserved' : 'all'

  const routes = show === 'all' ? query.data?.pages.flatMap((x) => x.body) : preserved
  const hasNextPage = show === 'all' ? query.hasNextPage : false

  return (
    <div className={`relative flex flex-col gap-4 ${className || ''}`}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Drives</h2>
        <Slider
          options={{ all: 'All', preserved: 'Preserved' }}
          value={show}
          onChange={(val) => setParams(val === 'all' ? undefined : { preserved: 'true' }, { replace: true })}
        />
      </div>

      <div className="flex flex-col gap-3">
        {routes?.map((route) => {
          let dayHeader: string | null = getDayHeader(route)

          if (dayHeader === prevDayHeader) dayHeader = null
          else prevDayHeader = dayHeader
          return (
            <Fragment key={`${route.id}-${route.start_time}`}>
              {dayHeader && (
                <div className="pt-4 pb-2 px-2">
                  <h2 className="text-sm font-bold text-white/60">{dayHeader}</h2>
                </div>
              )}
              <RouteCard route={route} />
            </Fragment>
          )
        })}
      </div>
      {hasNextPage && (
        <div className="py-8 flex justify-center col-span-full">
          <Button onClick={() => query.fetchNextPage()}>Load more</Button>
        </div>
      )}
    </div>
  )
}

export const Component = () => {
  const { dongleId } = useParams()
  const [device] = useDevice(dongleId || '')

  const [fade, setFade] = useState(1)
  const [battery, setBattery] = useState<number>()
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get('devices') === 'true'

  const setOpen = (newOpen: boolean) => setSearchParams(newOpen ? { devices: 'true' } : {})

  useEffect(() => {
    if (dongleId) {
      callAthena({ type: 'getMessage', dongleId, params: { service: 'peripheralState', timeout: 5000 } }).then((x) =>
        setBattery(x ? x.peripheralState.voltage / 1000 : undefined),
      )
    }
  }, [dongleId])

  useEffect(() => {
    const onScroll = () => setFade(Math.max(0, 1 - window.scrollY / 300))

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!device) return <Loading className="h-screen w-screen" />
  return (
    <>
      {/* Mobile Header & Hero */}
      <div className="md:hidden fixed top-0 w-full h-[500px] overflow-hidden" style={{ opacity: fade }}>
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

        <DeviceLocation dongleId={dongleId || ''} device={device} className="h-full w-full absolute" />
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

      {/* Desktop Layout Container */}
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        {/* Desktop Hero (Map) */}
        <div className="hidden md:block w-full h-[400px] relative overflow-hidden">
          <DeviceLocation dongleId={dongleId || ''} device={device} className="h-full w-full absolute" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>

        <div className="md:hidden h-[430px] pointer-events-none"></div>

        <div className="w-full flex flex-col gap-6 p-6 relative z-10">
          <div className="md:hidden">
            <ActionBar />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="md:hidden">
                <Buttons dongleId={dongleId || ''} />
              </div>
              {/* Desktop: Drive List */}
              <div className="hidden md:block">
                <DriveList dongleId={dongleId || ''} />
              </div>
              {/* Mobile: Statistics */}
              <div className="md:hidden">
                <Statistics dongleId={dongleId || ''} />
              </div>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Desktop: Statistics (moved to right column) */}
              <div className="hidden md:block">
                <Statistics dongleId={dongleId || ''} />
              </div>
              <Info dongleId={dongleId || ''} />
            </div>
          </div>
        </div>
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
