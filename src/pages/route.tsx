import { dayjs } from '~/utils/format'
import { resolved } from '~/utils/reactivity'

import { IconButton } from '~/components/material/IconButton'
import { TopAppBar } from '~/components/material/TopAppBar'
import { RouteActions } from '~/components/RouteActions'
import { RouteStaticMap } from '~/components/RouteStaticMap'
import { RouteStatisticsBar } from '~/components/RouteStatisticsBar'
import { RouteVideoPlayer } from '~/components/RouteVideoPlayer'
import { RouteUploadButtons } from '~/components/RouteUploadButtons'
import { Timeline } from '~/components/Timeline'
import { generateRouteStatistics, getTimelineEvents } from '~/api/derived'
import { createResource, useCreateSignal } from '~/fix'
import { Suspense } from 'react'
import { Link } from 'react-router-dom'

export const Component = () => {
  return null
  const [seekTime, setSeekTime] = useCreateSignal(props.startTime)
  const [videoRef, setVideoRef] = useCreateSignal<HTMLVideoElement>()

  const routeName = `${props.dongleId}|${props.dateStr}`
  const [route] = createResource(routeName, getRoute)
  const startTime = route.data ? dayjs(route.data?.start_time).format('dddd, MMM D, YYYY') : ''

  const selection = { startTime: props.startTime, endTime: props.endTime }

  // FIXME: generateTimelineStatistics is given different versions of TimelineEvents multiple times, leading to stuttering engaged % on switch
  const [events] = createResource(route, getTimelineEvents, { initialValue: [] })
  const [statistics] = createResource(
    () => [route(), events()] as const,
    ([r, e]) => generateRouteStatistics(r, e),
  )

  const onTimelineChange = (newTime: number) => {
    const video = videoRef()
    if (video) video.currentTime = newTime
  }

  createEffect(() => {
    routeName() // track changes
    setSeekTime(props.startTime)
    onTimelineChange(props.startTime)
  })

  const [device] = createResource(() => props.dongleId, getDevice)
  const [profile] = createResource(getProfile)
  createEffect(() => {
    if (!resolved(device) || !resolved(profile) || (!device().is_owner && !profile().superuser)) return
    void setRouteViewed(device().dongle_id, props.dateStr)
  })

  return (
    <>
      <TopAppBar component="h2" leading={<IconButton className="md:hidden" name="arrow_back" href={`/${props.dongleId}`} />}>
        <Suspense fallback={<div className="skeleton-loader max-w-64 rounded-xs h-[28px]" />}>{startTime}</Suspense>
      </TopAppBar>

      <div className="flex flex-col gap-6 px-4 pb-4">
        <div className="flex flex-col">
          <RouteVideoPlayer ref={setVideoRef} routeName={routeName} selection={selection} onProgress={setSeekTime} />
          <Timeline className="mb-1" route={route.data} seekTime={seekTime()} updateTime={onTimelineChange} events={events.data} />

          {selection.startTime ||
            (selection.endTime && (
              <Link
                className="flex items-center justify-center text-center text-label-lg text-gray-500 mt-4"
                to={`/${props.dongleId}/${props.dateStr}`}
              >
                Clear current route selection
                <IconButton name="close_small" />
              </Link>
            ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Route Info</span>
          <div className="flex flex-col rounded-md overflow-hidden bg-surface-container">
            <RouteStatisticsBar className="p-5" route={route.data} statistics={statistics} />

            <RouteActions routeName={routeName} route={route.data} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Upload Files</span>
          <div className="flex flex-col rounded-md overflow-hidden bg-surface-container">
            <RouteUploadButtons route={route.data} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">Route Map</span>
          <div className="aspect-square overflow-hidden rounded-lg">
            <Suspense fallback={<div className="h-full w-full skeleton-loader bg-surface-container" />}>
              <RouteStaticMap route={route.data} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
