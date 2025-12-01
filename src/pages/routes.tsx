import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(utc)
dayjs.extend(timezone)

import type { Route } from '../types'
import { dateTimeToColorBetween, formatDistance, formatDuration } from '../utils/format'
import { Fragment, useEffect, useState } from 'react'
import { BackButton } from '../components/material/BackButton'
import { api } from '../api'
import { Button } from '../components/material/Button'
import { useParams } from '../utils/hooks'
import { getPlaceName } from '../utils/map'
import { usePreservedRoutes } from '../api/queries'
import { Slider } from '../components/material/Slider'
import { Icon } from '../components/material/Icon'
import { Link, useSearchParams } from 'react-router-dom'

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

const PAGE_SIZE = 10
const getDayHeader = (route: Route) => {
  const date = dayjs.utc(route.start_time).local()
  if (date.isSame(dayjs(), 'day')) return `Today – ${date.format('dddd, MMM D')}`
  else if (date.isSame(dayjs().subtract(1, 'day'), 'day')) return `Yesterday – ${date.format('dddd, MMM D')}`
  else if (date.year() === dayjs().year()) return date.format('dddd, MMM D')
  else return date.format('dddd, MMM D, YYYY')
}

export const Component = () => {
  const { dongleId } = useParams()
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
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <BackButton fallback={`/${dongleId}`} />
          <div className="flex bg-background-alt rounded-lg p-1">
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                show === 'all' ? 'bg-white text-black shadow-sm' : 'text-background-alt-x hover:text-white'
              }`}
              onClick={() => setParams(undefined, { replace: true })}
            >
              All
            </button>
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                show === 'preserved' ? 'bg-white text-black shadow-sm' : 'text-background-alt-x hover:text-white'
              }`}
              onClick={() => setParams({ preserved: 'true' }, { replace: true })}
            >
              Preserved
            </button>
          </div>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
        <div className="px-6 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Drives</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {routes?.map((route) => {
          let dayHeader: string | null = getDayHeader(route)

          if (dayHeader === prevDayHeader) dayHeader = null
          else prevDayHeader = dayHeader
          return (
            <Fragment key={`${route.id}-${route.start_time}`}>
              {dayHeader && (
                <div className="sticky top-[120px] z-0 py-2 bg-background/95 backdrop-blur-sm -mx-4 px-8 border-b border-white/5 mb-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-background-alt-x">{dayHeader}</h2>
                </div>
              )}
              <RouteCard route={route} />
            </Fragment>
          )
        })}
        {hasNextPage && (
          <div className="py-8 flex justify-center">
            <Button onClick={() => query.fetchNextPage()}>Load more</Button>
          </div>
        )}
      </div>
    </div>
  )
}
