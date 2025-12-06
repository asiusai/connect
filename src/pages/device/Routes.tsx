import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import {
  getRouteColor,
  formatDate,
  formatDistance,
  formatDurationMs,
  getRouteDurationMs,
  formatTime,
  getDateTime,
} from '../../utils/format'
import { useEffect, useState } from 'react'
import { Slider } from '../../components/Slider'
import { Fragment } from 'react'
import { api } from '../../api'
import { usePreservedRoutes } from '../../api/queries'
import { Route } from '../../types'
import { Link } from 'react-router-dom'
import { getPlaceName } from '../../utils/map'
import { useRouteParams } from '../../utils/hooks'
import clsx from 'clsx'
import { useStorage } from '../../utils/storage'

const PAGE_SIZE = 10

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
  const startTime = getDateTime(route.start_time)
  const endTime = getDateTime(route.end_time)
  const color = getRouteColor(startTime, endTime, [30, 57, 138], [218, 161, 28])
  const duration = getRouteDurationMs(route)

  const [location, setLocation] = useState<string | null>(null)
  useEffect(() => void getLocation(route).then(setLocation), [route])

  return (
    <Link
      to={`/${route.dongle_id}/${route.fullname.slice(17)}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl bg-background-alt p-4 shadow-sm transition-all hover:bg-background-alt/80 active:scale-[0.99]"
    >
      {/* Color Indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />

      <div className="flex flex-col gap-1 pl-3">
        {/* Time and Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <span>{formatTime(startTime)}</span>
            <span className="text-white/40 text-sm font-normal">•</span>
            <span>{formatTime(endTime)}</span>
          </div>
          {duration && (
            <div className="text-xs font-medium text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{formatDurationMs(duration)}</div>
          )}
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
            <span className="text-xs font-medium text-white/70">{formatDistance(route.distance)}</span>
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

export const Routes = ({ className }: { className: string }) => {
  const { dongleId } = useRouteParams()
  const [preserved] = usePreservedRoutes(dongleId)
  const query = api.routes.allRoutes.useInfiniteQuery({
    queryKey: ['allRoutes', dongleId],
    queryData: ({ pageParam }) => ({ query: pageParam as any, params: { dongleId } }),
    initialPageParam: { created_before: undefined, limit: PAGE_SIZE },
    getNextPageParam: (lastPage: any) => {
      if (lastPage.body.length !== PAGE_SIZE) return
      return { created_before: lastPage.body[lastPage.body.length - 1].create_time, limit: PAGE_SIZE }
    },
  })

  let prevDayHeader: string | undefined

  const [show, setShow] = useStorage('routesType')

  const routes = show === 'all' ? query.data?.pages.flatMap((x) => x.body) : preserved
  const hasNextPage = show === 'all' ? query.hasNextPage : false

  return (
    <div className={clsx('relative flex flex-col', className)}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Drives</h2>
        <Slider options={{ all: 'All', preserved: 'Preserved' }} value={show} onChange={setShow} />
      </div>

      <div className="flex flex-col gap-3">
        {routes?.map((route) => {
          let dayHeader = route.start_time ? formatDate(route.start_time) : undefined

          if (dayHeader === prevDayHeader) dayHeader = undefined
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
        <div className="py-4 flex justify-center col-span-full px-2">
          <ButtonBase
            className="w-full py-3 rounded-xl font-bold text-center bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => query.fetchNextPage()}
          >
            Load more
          </ButtonBase>
        </div>
      )}
    </div>
  )
}
