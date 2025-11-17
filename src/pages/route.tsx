import { dayjs } from '../utils/format'

import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { RouteActions } from '../components/RouteActions'
import { RouteStaticMap } from '../components/RouteStaticMap'
import { RouteStatisticsBar } from '../components/RouteStatisticsBar'
import { RouteUploadButtons } from '../components/RouteUploadButtons'
import { useParams } from 'react-router-dom'
import { RouteVideoPlayer } from '../components/RouteVideoPlayer'
import { useRoute } from '../api/queries'
import { Timeline } from '../components/Timeline'
import { getTimelineEvents, TimelineEvent } from '../utils/derived'
import { useEffect, useRef, useState } from 'react'
import { PlayerRef } from '@remotion/player'

// TODO: get start and end time from URL
export const Component = () => {
  const playerRef = useRef<PlayerRef>(null)
  const { dongleId, date } = useParams()

  const routeName = `${dongleId}|${date}`
  const [route] = useRoute(routeName)
  const [events, setEvents] = useState<TimelineEvent[]>([])

  useEffect(() => {
    if (route) void getTimelineEvents(route).then(setEvents)
  }, [route])
  if (!route) return null

  const startTime = dayjs(route.start_time).format('dddd, MMM D, YYYY')
  // TODO: set route viewed

  return (
    <>
      <TopAppBar component="h2" leading={<IconButton name="keyboard_arrow_left" href={`/${dongleId}/routes`} />}>
        {startTime}
      </TopAppBar>

      <div className="flex flex-col gap-6 px-4 pb-4">
        <div className="flex flex-col">
          <RouteVideoPlayer playerRef={playerRef} route={route} />
          <Timeline playerRef={playerRef} className="mb-1" route={route} events={events} />
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
            <RouteStaticMap route={route} />
          </div>
        </div>
      </div>
    </>
  )
}
