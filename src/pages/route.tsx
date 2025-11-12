import { dayjs } from '~/utils/format'

import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'
import { RouteActions } from '~/components/RouteActions'
import { RouteStaticMap } from '~/components/RouteStaticMap'
import { RouteStatisticsBar } from '~/components/RouteStatisticsBar'
import { RouteUploadButtons } from '~/components/RouteUploadButtons'
import { generateRouteStatistics, getTimelineEvents, RouteStatistics, TimelineEvent } from '~/api/derived'
import { Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '~/api'

// TODO: get start and end time from URL
export const Component = () => {
  const { dongleId, date } = useParams()

  const routeName = `${dongleId}|${date}`
  const routeReq = api.routes.get.useQuery({ queryKey: ['route', routeName], queryData: { params: { routeName } } })
  const route = routeReq.data?.body
  const startTime = route ? dayjs(route.start_time).format('dddd, MMM D, YYYY') : ''

  const selection = { startTime: 0, endTime: undefined }

  // FIXME: generateTimelineStatistics is given different versions of TimelineEvents multiple times, leading to stuttering engaged % on switch
  const [events, setEvents] = useState<TimelineEvent[]>([])
  console.log(events)
  const [stats, setStats] = useState<RouteStatistics>()

  useEffect(() => {
    if (route)
      getTimelineEvents(route).then((x) => {
        setEvents(x)
        setStats(generateRouteStatistics(route, x))
      })
  }, [route])

  // TODO: set route viewed?
  return (
    <>
      <TopAppBar component="h2" leading={<IconButton className="md:hidden" name="arrow_back" href={`/${dongleId}`} />}>
        <Suspense fallback={<div className="skeleton-loader max-w-64 rounded-xs h-[28px]" />}>{startTime}</Suspense>
      </TopAppBar>

      <div className="flex flex-col gap-6 px-4 pb-4">
        <div className="flex flex-col">
          {/* <RouteVideoPlayer ref={videoRef} routeName={routeName} selection={selection} onProgress={setSeekTime} /> */}
          {/* <Timeline className="mb-1" route={route} seekTime={seekTime} updateTime={onTimelineChange} events={events} /> */}

          {selection.startTime ||
            (selection.endTime && (
              <Link className="flex items-center justify-center text-center text-label-lg text-gray-500 mt-4" to={`/${dongleId}/${date}`}>
                Clear current route selection
                <IconButton name="close_small" />
              </Link>
            ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Route Info</span>
          <div className="flex flex-col rounded-md overflow-hidden bg-surface-container">
            <RouteStatisticsBar className="p-5" route={route} stats={stats} />

            <RouteActions routeName={routeName} route={route} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Upload Files</span>
          <div className="flex flex-col rounded-md overflow-hidden bg-surface-container">
            <RouteUploadButtons route={route} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Route Map</span>
          <div className="aspect-square overflow-hidden rounded-lg">
            <Suspense fallback={<div className="h-full w-full skeleton-loader bg-surface-container" />}>
              <RouteStaticMap route={route} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
