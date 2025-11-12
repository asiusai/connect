import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(utc)
dayjs.extend(timezone)

import { getRouteStatistics, RouteStatistics } from '~/api/derived'
import { Card, CardContent, CardHeader } from '~/components/material/Card'
import { Icon } from '~/components/material/Icon'
import { RouteStatisticsBar } from '~/components/RouteStatisticsBar'
import { getPlaceName } from '~/map/geocode'
import type { Route } from '~/api/types'
import { dateTimeToColorBetween } from '~/utils/format'
import { Fragment, Suspense, useEffect, useState } from 'react'
import { api } from '~/api'

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

export const RouteCard = ({ route }: { route: Route }) => {
  const startTime = () => dayjs.utc(route.start_time).local()
  const endTime = () => dayjs.utc(route.end_time).local()
  const color = () => dateTimeToColorBetween(startTime().toDate(), endTime().toDate(), [30, 57, 138], [218, 161, 28])

  const [location, setLocation] = useState<string | null>(null)
  useEffect(() => void getLocation(route).then(setLocation), [route])

  const [stats, setStats] = useState<RouteStatistics>()
  useEffect(() => void getRouteStatistics(route).then(setStats), [route])

  return (
    <Card className="max-w-none" href={`/${route.dongle_id}/${route.fullname.slice(17)}`} activeClass="md:before:bg-primary">
      <CardHeader
        headline={`${startTime().format('h:mm A')} to ${endTime().format('h:mm A')}`}
        subhead={<Suspense fallback={<div className="h-[20px] w-auto skeleton-loader rounded-xs" />}>{location}</Suspense>}
        trailing={
          stats?.userFlags ? (
            <div className="flex items-center justify-center rounded-full p-1 border-amber-300 border-2">
              <Icon className="text-yellow-300" size="24" name="flag" filled />
            </div>
          ) : undefined
        }
      />

      <CardContent>
        <RouteStatisticsBar route={route} stats={stats} />
      </CardContent>
      <div className="h-2.5 w-full" style={{ background: color() }} />
    </Card>
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

export const RouteList = ({ dongleId }: { dongleId: string }) => {
  const routes = api.routes.allRoutes.useQuery({
    queryKey: ['allRoutes', dongleId],
    queryData: { params: { dongleId }, query: { limit: PAGE_SIZE } },
  })

  let prevDayHeader: string | null = null

  return (
    <div className="flex w-full flex-col justify-items-stretch gap-4">
      {!routes.data && (
        <>
          <h2 className="skeleton-loader rounded-md min-h-7"></h2>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i as any} className="skeleton-loader flex h-[140px] flex-col rounded-lg" />
          ))}
        </>
      )}
      {routes.data?.body.map((route) => {
        let dayHeader: string | null = getDayHeader(route)

        if (dayHeader === prevDayHeader) dayHeader = null
        else prevDayHeader = dayHeader
        return (
          <Fragment key={route.create_time}>
            {dayHeader && <h2 className="px-4 text-lg font-bold text-on-surface-variant">{dayHeader}</h2>}
            <RouteCard route={route} />
          </Fragment>
        )
      })}
    </div>
  )
}
