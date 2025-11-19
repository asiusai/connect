import { dayjs } from '../utils/format'

import { IconButton } from '../components/material/IconButton'
import { TopAppBar } from '../components/material/TopAppBar'
import { RouteStaticMap } from '../components/RouteStaticMap'
import { RouteStatisticsBar } from '../components/RouteStatisticsBar'
import { RouteFiles } from '../components/RouteFiles'
import { useParams } from 'react-router-dom'
import { RouteVideoPlayer } from '../components/RouteVideoPlayer'
import { usePreservedRoutes, useRoute } from '../api/queries'
import { Timeline } from '../components/Timeline'
import { getTimelineEvents, TimelineEvent } from '../utils/derived'
import { useEffect, useRef, useState } from 'react'
import { PlayerRef } from '@remotion/player'
import { api } from '../api'
import { Route } from '../types'

const useIsPreserved = (route: Route) => {
  const [preserved] = usePreservedRoutes(route.dongle_id)
  const [isPreserved, setIsPreserved] = useState<boolean>()
  useEffect(() => setIsPreserved(preserved ? preserved.some((p) => p.fullname === route.fullname) : undefined), [preserved, route.fullname])
  return [
    isPreserved,
    async (isPreserved: boolean) => {
      setIsPreserved(isPreserved)
      isPreserved
        ? await api.routes.preserve.mutate({ body: {}, params: { routeName: route.fullname } })
        : await api.routes.unPreserve.mutate({ body: {}, params: { routeName: route.fullname } })
    },
  ] as const
}
const useIsPublic = (route: Route) => {
  const [isPublic, setIsPublic] = useState(route.is_public)
  return [
    isPublic,
    async (isPublic: boolean) => {
      await api.routes.setPublic.mutate({ body: { is_public: isPublic }, params: { routeName: route.fullname } })
      setIsPublic(isPublic)
    },
  ] as const
}

const Top = ({ route }: { route: Route }) => {
  const [isPreserved, setIsPreserved] = useIsPreserved(route)
  const [isPublic, setIsPublic] = useIsPublic(route)
  const startTime = dayjs(route.start_time).format('dddd, MMM D, YYYY')
  return (
    <TopAppBar
      component="h2"
      leading={<IconButton name="keyboard_arrow_left" href={`/${route.dongle_id}/routes`} />}
      trailing={
        <>
          <IconButton name={isPreserved ? 'bookmark_check' : 'bookmark'} onClick={() => setIsPreserved(!isPreserved)} />
          <IconButton name={isPublic ? 'public' : 'public_off'} onClick={() => setIsPublic(!isPublic)} />
        </>
      }
    >
      {startTime}
    </TopAppBar>
  )
}

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

  // TODO: set route viewed

  return (
    <>
      <Top route={route} />
      <div className="flex flex-col gap-6 px-4 pb-4">
        <div className="flex flex-col">
          <RouteVideoPlayer playerRef={playerRef} route={route} />
          <Timeline playerRef={playerRef} className="mb-1" route={route} events={events} />
        </div>

        <div className="flex flex-col gap-2  rounded-md overflow-hidden bg-surface-container">
          <RouteStatisticsBar className="p-5" route={route} />
        </div>

        <div className="aspect-square overflow-hidden rounded-lg">
          <RouteStaticMap route={route} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-title-lg font-bold">Files</span>
          <div className="flex flex-col rounded-md overflow-hidden bg-surface-container">
            <RouteFiles route={route} />
          </div>
        </div>
      </div>
    </>
  )
}
