import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(utc)
dayjs.extend(timezone)

import { RouteStatisticsBar } from '../components/RouteStatisticsBar'
import type { Route } from '../types'
import { dateTimeToColorBetween } from '../utils/format'
import { Fragment, useEffect, useState } from 'react'
import { TopAppBar } from '../components/material/TopAppBar'
import { IconButton } from '../components/material/IconButton'
import { api } from '../api'
import { Button } from '../components/material/Button'
import { useParams } from '../utils/hooks'
import { getPlaceName } from '../utils/map'
import { usePreservedRoutes } from '../api/queries'
import { Toggle } from '../components/material/Toggle'
import { Icon } from '../components/material/Icon'
import { Link } from 'react-router-dom'

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
  return (
    <Link
      to={`/${route.dongle_id}/routes/${route.fullname.slice(17)}`}
      className="w-full overflow-hidden rounded-xl bg-background-alt text-background-x shadow-sm transition-all hover:bg-background-alt/50 hover:shadow-md"
      style={{ borderLeft: `6px solid ${color}` }}
    >
      <div className="flex flex-col gap-3 p-4 pl-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-lg md:text-xl font-semibold tracking-tight">{startTime.format('h:mm A')}</span>
            <span className="text-background-alt-x/50">→</span>
            <span className="font-medium text-background-alt-x">{endTime.format('h:mm A')}</span>
            <Icon name="location_on" className="text-[18px] text-background-alt-x" />
            <span className="text-base font-medium leading-snug text-background-alt-x">{location || 'Loading...'}</span>
          </div>

          <Icon name={route.is_public ? 'public' : 'public_off'} />
        </div>

        <RouteStatisticsBar route={route} />
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

  const [show, setShow] = useState<'all' | 'preserved'>('all')
  const routes = show === 'all' ? query.data?.pages.flatMap((x) => x.body) : preserved
  const hasNextPage = show === 'all' ? query.hasNextPage : false
  return (
    <>
      <TopAppBar
        leading={<IconButton name="keyboard_arrow_left" href={`/${dongleId}`} />}
        trailing={<Toggle options={{ all: 'All', preserved: 'Preserved' }} value={show} onChange={setShow} />}
      >
        Routes
      </TopAppBar>
      <div className="flex w-full flex-col justify-items-stretch gap-4 px-4 pb-4">
        {routes?.map((route) => {
          let dayHeader: string | null = getDayHeader(route)

          if (dayHeader === prevDayHeader) dayHeader = null
          else prevDayHeader = dayHeader
          return (
            <Fragment key={`${route.id}-${route.start_time}`}>
              {dayHeader && <h2 className="px-4 text-lg font-bold text-background-alt-x">{dayHeader}</h2>}
              <RouteCard route={route} />
            </Fragment>
          )
        })}
        {hasNextPage && <Button onClick={() => query.fetchNextPage()}>Load more</Button>}
      </div>
    </>
  )
}
