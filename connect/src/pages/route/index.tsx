import { RouteFiles } from './Files'
import { RouteVideoPlayer, VideoControls } from './VideoPlayer'
import { api } from '../../api'
import { useEffect } from 'react'
import { useRouteParams } from '../../hooks'
import { TopAppBar } from '../../components/TopAppBar'
import { DynamicMap } from './Map'
import { Stats } from './Stats'
import { Actions } from './Actions'
import { formatDate, formatTime } from '../../utils/format'
import { Info } from './Info'
import { useDevice } from '../../hooks/useDevice'
import { useRouteLocation } from '../../hooks/useRouteLocation'
import { usePreviewProps } from '../../hooks/usePreviewProps'

export const Component = () => {
  const { routeName, routeId } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const previewProps = usePreviewProps()
  const { call } = useDevice()
  const location = useRouteLocation(route)

  useEffect(() => {
    call?.('setRouteViewed', { route: routeId })
  }, [routeId, call])

  if (!route) return null

  return (
    <>
      <TopAppBar>
        <span>{location}</span>
        {route.start_time && (
          <span className="text-xs md:text-sm font-medium text-white/60">
            {formatDate(route.start_time)} {formatTime(route.start_time)}
          </span>
        )}
      </TopAppBar>

      <div className="grid md:grid-cols-3 gap-3 md:gap-4 p-4 max-w-7xl mx-auto w-full">
        <RouteVideoPlayer className="md:col-span-2 md:order-1" props={previewProps} />
        <VideoControls className="md:col-span-2 md:order-3" />
        <Stats route={route} className="md:order-6" />
        <Actions route={route} className="md:order-4" />
        <RouteFiles route={route} className="md:col-span-2 md:row-span-3 md:order-5" />
        <DynamicMap route={route} className="md:order-2" />
        <Info route={route} className="md:order-7" />
      </div>
    </>
  )
}
