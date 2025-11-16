import { dayjs } from '../utils/format'

import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { RouteActions } from '../components/RouteActions'
import { RouteStaticMap } from '../components/RouteStaticMap'
import { RouteStatisticsBar } from '../components/RouteStatisticsBar'
import { RouteUploadButtons } from '../components/RouteUploadButtons'
import { Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RouteVideoPlayer } from '../components/RouteVideoPlayer'
import { useRoute } from '../api/queries'

// TODO: get start and end time from URL
export const Component = () => {
  const { dongleId, date } = useParams()

  const routeName = `${dongleId}|${date}`
  const [route] = useRoute(routeName)

  const startTime = route ? dayjs(route.start_time).format('dddd, MMM D, YYYY') : ''

  const selection = { startTime: 0, endTime: undefined }

  // TODO: set route viewed
  return (
    <>
      <TopAppBar component="h2" leading={<IconButton name="keyboard_arrow_left" href={`/${dongleId}/routes`} />}>
        {startTime}
      </TopAppBar>

      <div className="flex flex-col gap-6 px-4 pb-4">
        <div className="flex flex-col">
          <RouteVideoPlayer routeName={routeName} selection={selection} />
          {/* <Timeline className="mb-1" route={route} seekTime={seekTime} updateTime={onTimelineChange} events={events} /> */}

          {(selection.startTime || selection.endTime) && (
            <Link className="flex items-center justify-center text-center text-label-lg text-gray-500 mt-4" to={`/${dongleId}/${date}`}>
              Clear current route selection
              <IconButton name="close_small" />
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Route Info</span>
          <div className="flex flex-col rounded-md overflow-hidden bg-surface-container">
            {route && <RouteStatisticsBar className="p-5" route={route} />}

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
