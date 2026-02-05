import { ButtonBase } from '../../components/ButtonBase'
import { CarIcon, GlobeIcon } from 'lucide-react'
import { formatDate, formatDistance, formatDurationMs, getRouteDurationMs, formatTime, getDateTime } from '../../utils/format'
import { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react'

import { Fragment } from 'react'
import { api } from '../../api'
import { Route, RouteSegment } from '../../../../shared/types'
import { Link } from 'react-router-dom'
import { getStartEndPlaceName } from '../../utils/map'
import { useRouteParams } from '../../hooks'
import { useSettings } from '../../hooks/useSettings'
import { getRouteStats, getTimelineEvents, RouteStats, TimelineEvent } from '../../utils/derived'
import { cn, getRouteUrl } from '../../../../shared/helpers'

const PAGE_SIZE = 10

const getLocationText = ({ start, end }: { start?: string; end?: string }) => {
  if (!start && !end) return ''
  if (!end || start === end) return start
  if (!start) return end
  return `${start} to ${end}`
}

const Timeline = ({ events, duration, baseRouteUrl }: { events: TimelineEvent[]; duration: number; baseRouteUrl: string }) => {
  return (
    <div className="relative h-1.5 w-full bg-white/10 mt-0">
      {events.map((ev, i) => {
        const start = ev.route_offset_millis
        const end = 'end_route_offset_millis' in ev ? ev.end_route_offset_millis : start
        const width = ((end - start) / duration) * 100
        const left = (start / duration) * 100

        let color = 'bg-transparent'
        if (ev.type === 'engaged') color = 'bg-[#32CD32]'
        else if (ev.type === 'alert')
          color = 'bg-orange-500' // user interaction/alert
        else if (ev.type === 'overriding') color = 'bg-blue-500'

        if (color === 'bg-transparent') return null

        return (
          <Link
            key={i}
            to={`${baseRouteUrl}/${Math.round(start / 1000)}`}
            className={cn('absolute top-0 bottom-0 hover:brightness-125 transition-all', color)}
            style={{ left: `${left}%`, width: `${width}%` }}
            onClick={(e) => e.stopPropagation()}
            title={ev.type}
          />
        )
      })}
    </div>
  )
}

const Filmstrip = ({ route }: { route: Route }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  // Determine image count based on width
  // Height is h-12 (48px). Desired aspect ratio ~3:2 => width ~72px per image
  // Fallback to 16 for SSR or initial render
  const imageCount = width ? Math.max(1, Math.round(width / 72)) : 16

  const baseRouteUrl = `/${route.dongle_id}/${route.fullname.slice(17)}`

  const images = useMemo(() => {
    const totalImages = route.maxqlog + 1
    return Array.from({ length: imageCount }).map((_, i) => {
      const index = Math.min(Math.floor(i * (totalImages / imageCount)), totalImages - 1)
      return {
        src: getRouteUrl(route, index, 'sprite.jpg'),
        seekTime: index * 60,
      }
    })
  }, [route, imageCount])

  return (
    <div ref={ref} className="grid w-full h-12 bg-black/20" style={{ gridTemplateColumns: `repeat(${imageCount}, minmax(0, 1fr))` }}>
      {images.map((img, i) => (
        <Link
          key={i}
          to={`${baseRouteUrl}/${img.seekTime}`}
          className="relative w-full h-full overflow-hidden bg-gray-900 block group/image"
          // Prevent dragging link/image to mess up UI
          draggable={false}
        >
          <img
            src={img.src}
            className="h-full w-full object-cover opacity-80 transition-all duration-300 group-hover/image:opacity-100"
            loading="lazy"
            draggable={false}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.visibility = 'hidden'
            }}
          />
        </Link>
      ))}
    </div>
  )
}

const RouteCard = ({ route }: { route: RouteSegment | (Route & { is_preserved: true }) }) => {
  const startTime = getDateTime(route.start_time)
  const endTime = getDateTime(route.end_time)
  const durationMs = getRouteDurationMs(route) ?? 0

  const [location, setLocation] = useState<{ start?: string; end?: string }>()
  const [stats, setStats] = useState<RouteStats>()
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])

  useEffect(() => {
    getStartEndPlaceName(route).then(setLocation)
    getTimelineEvents(route).then((timeline) => {
      setTimeline(timeline)
      getRouteStats(timeline).then(setStats)
    })
  }, [route])

  const engagementPercent = stats ? (stats.engagedDurationMs / durationMs) * 100 : 0
  const routeUrl = `/${route.dongle_id}/${route.fullname.slice(17)}`

  const [distVal, distUnit] = formatDistance(route.distance ?? 0)!.split(' ')

  // Helper for duration
  const durationStr = formatDurationMs(durationMs)
  const durationVal = durationStr.replace(/[a-z]/g, '').trim()
  const durationUnit = durationStr.replace(/[0-9.]/g, '').trim()

  return (
    <div className="group flex flex-col rounded-xl bg-background-alt overflow-hidden transition-all border border-white/5 shadow-sm hover:shadow-md hover:border-white/10">
      {/* Container for Visuals + Timeline */}
      <div className="relative flex flex-col w-full overflow-hidden group-hover:ring-1 group-hover:ring-white/10 rounded-t-lg">
        {/* Public Icon Overlay */}
        {route.is_public && (
          <div className="absolute top-0 right-0 z-10 rounded-bl-lg bg-green-500 p-1.5 shadow-md">
            <GlobeIcon className="text-white text-[16px]" />
          </div>
        )}

        <div className="transition-opacity duration-300 opacity-90 group-hover:opacity-100">
          <Filmstrip route={route} />
          <Timeline events={timeline} duration={durationMs} baseRouteUrl={routeUrl} />
        </div>
      </div>

      {/* Bottom Info: Clickable Link */}
      <Link to={routeUrl} className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors">
        <div className="flex flex-col gap-0.5">
          {/* Time */}
          <div className="text-base font-semibold text-white tracking-normal">
            {formatTime(startTime)} - {formatTime(endTime)}
          </div>
          {/* Location */}
          <div className="text-xs text-white/50 truncate max-w-70">{location ? getLocationText(location) : 'Loading location...'}</div>
        </div>

        {/* Stats Grid */}
        <div className="flex items-center gap-6">
          {/* Duration Block */}
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-white leading-none">{durationVal}</span>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{durationUnit || 'min'}</span>
          </div>

          {/* Distance Block */}
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold text-white leading-none">{distVal}</span>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{distUnit || 'km'}</span>
          </div>

          {/* Engagement Block */}
          <div className="flex flex-col items-end min-w-9">
            <span className="text-lg font-bold text-[#32CD32] leading-none">{Math.round(engagementPercent || 0)}%</span>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Engaged</span>
          </div>
        </div>
      </Link>
    </div>
  )
}

const EmptyState = ({ preserved }: { preserved?: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <CarIcon className="text-white/20 text-5xl mb-4" />
    <h3 className="text-lg font-semibold text-white/70 mb-2">{preserved ? 'No preserved drives' : 'No drives yet'}</h3>
    <p className="text-sm text-white/40 max-w-xs">
      {preserved
        ? 'Preserve drives from the route page to keep them from being deleted.'
        : 'Go for a drive and connect your device to the internet to see your routes here.'}
    </p>
  </div>
)

const All = () => {
  const { dongleId } = useRouteParams()
  const [allRoutes, setAllRoutes] = useState<RouteSegment[]>()
  const [endTime, setEndTime] = useState(Date.now())
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: allRoutes
  useEffect(() => {
    if (!allRoutes) return

    setAllRoutes(undefined)
    setEndTime(Date.now())
    setHasMore(true)
    setIsLoadingMore(false)
  }, [dongleId])

  api.routes.routesSegments.useQuery({
    params: { dongleId },
    query: { start: 0, end: endTime, limit: PAGE_SIZE },
    onSuccess: (data) => {
      if (!allRoutes) setAllRoutes(data)
      else setAllRoutes((prev) => [...(prev ?? []), ...data])
      setHasMore(data.length === PAGE_SIZE)
      setIsLoadingMore(false)
    },
  })

  const loadMore = () => {
    if (!allRoutes?.length || isLoadingMore) return
    setIsLoadingMore(true)
    const lastRoute = allRoutes[allRoutes.length - 1]
    setEndTime(lastRoute.start_time_utc_millis - 1)
  }

  let prevDayHeader: string | undefined

  if (allRoutes && allRoutes.length === 0) return <EmptyState />

  return (
    <>
      <div className="flex flex-col gap-4">
        {allRoutes?.map((route) => {
          let dayHeader = route.start_time ? formatDate(route.start_time) : undefined
          if (dayHeader === prevDayHeader) dayHeader = undefined
          else prevDayHeader = dayHeader
          return (
            <Fragment key={`${route.id}-${route.start_time}`}>
              {dayHeader && (
                <div className="px-2 pt-2 -mb-2">
                  <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">{dayHeader}</h2>
                </div>
              )}
              <RouteCard route={route} />
            </Fragment>
          )
        })}
      </div>
      {hasMore && allRoutes && allRoutes.length > 0 && (
        <div className="col-span-full flex justify-center py-6 px-2">
          <ButtonBase
            className="w-full rounded-xl bg-white/5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-white/10"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </ButtonBase>
        </div>
      )}
    </>
  )
}

const Preserved = () => {
  const { dongleId } = useRouteParams()
  const [preserved] = api.routes.preserved.useQuery({ params: { dongleId } })
  let prevDayHeader: string | undefined

  if (!preserved || preserved.length === 0) return <EmptyState preserved />

  return (
    <div className="flex flex-col gap-4">
      {preserved.map((route) => {
        let dayHeader = route.start_time ? formatDate(route.start_time) : undefined
        if (dayHeader === prevDayHeader) dayHeader = undefined
        else prevDayHeader = dayHeader
        return (
          <Fragment key={`${route.id}-${route.start_time}`}>
            {dayHeader && (
              <div className="px-2 pt-2 -mb-2">
                <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">{dayHeader}</h2>
              </div>
            )}
            <RouteCard route={{ ...route, is_preserved: true }} />
          </Fragment>
        )
      })}
    </div>
  )
}

export const RoutesTab = () => {
  const { routesType } = useSettings()

  return <div className={cn('relative flex flex-col')}>{routesType === 'all' ? <All /> : <Preserved />}</div>
}
