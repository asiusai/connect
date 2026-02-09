import { memo } from 'react'
import { useFiles } from '../../../api/queries'
import { useRouteLocation } from '../../../hooks/useRouteLocation'
import { usePreviewProps } from '../../../hooks/usePreviewProps'
import { useRouteParams } from '../../../hooks'
import { api } from '../../../api'
import { TopAppBar } from '../../../components/TopAppBar'
import { formatDate, formatTime } from '../../../utils/format'
import { RouteVideoPlayer, VideoControls } from '../VideoPlayer'
import { useCan } from './useCan'
import { useDbc } from './useDbc'
import { MessageList } from './MessageList'
import { MessageDetail } from './MessageDetail'
import { DbcSelector } from './DBCSelector'

// Isolated component for CAN/DBC data loading - prevents re-renders in parent
const CanDataLoader = () => {
  const { routeName } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [files] = useFiles(routeName, route)
  const logUrls = files?.logs.filter(Boolean) as string[] | undefined

  useCan(logUrls)
  useDbc()
  return null
}

// Memoized video section to prevent re-renders from cabana state updates
const VideoSection = memo(() => {
  const previewProps = usePreviewProps()
  return (
    <>
      <RouteVideoPlayer className="col-start-1 row-start-1" props={previewProps} />
      <VideoControls className="col-start-1 row-start-3" />
    </>
  )
})

export const Component = () => {
  const { routeName } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const location = useRouteLocation(route)

  if (!route) return null

  return (
    <div className="flex flex-col h-screen">
      <CanDataLoader />
      <TopAppBar>
        <span>{location}</span>
        {route.start_time && (
          <span className="text-xs md:text-sm font-medium text-white/60">
            {formatDate(route.start_time)} {formatTime(route.start_time)}
          </span>
        )}
        <div className="flex-1" />
        <DbcSelector />
      </TopAppBar>
      <div className="flex-1 grid md:grid-cols-2 gap-3 md:gap-4 p-4 max-w-7xl mx-auto w-full min-h-0">
        <VideoSection />
        <MessageDetail className="col-start-2 row-start-1" />
        <MessageList className="col-span-2 row-start-4 h-full" />
      </div>
    </div>
  )
}
