import { RouteFiles } from './Files'
import { RouteVideoPlayer, VideoControls } from './VideoPlayer'
import { useFiles } from '../../api/queries'
import { api } from '../../api'
import { useEffect, useMemo, useState } from 'react'
import { useRouteParams } from '../../hooks'
import { TopAppBar } from '../../components/TopAppBar'
import { getStartEndPlaceName } from '../../utils/map'
import { DynamicMap } from './Map'
import { Stats } from './Stats'
import { Actions } from './Actions'
import { formatDate, formatTime } from '../../utils/format'
import { Info } from './Info'
import { useSettings } from '../../hooks/useSettings'
import { PreviewProps } from '../../../../shared/types'
import { useDevice } from '../../hooks/useDevice'

const getLocationText = ({ start, end }: { start?: string; end?: string }) => {
  if (!start && !end) return 'Drive Details'
  if (!end || start === end) return `Drive in ${start}`
  if (!start) return `Drive in ${end}`
  return `${start} to ${end}`
}

export const usePreviewProps = () => {
  const { routeName } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [files] = useFiles(routeName, route)
  const { largeCameraType, smallCameraType, logType, unitFormat, showPath } = useSettings()

  const props = useMemo<PreviewProps>(
    () => ({
      routeName,
      largeCameraType,
      smallCameraType,
      logType,
      data: files && route ? { files, route } : undefined,
      unitFormat,
      showPath,
    }),
    [largeCameraType, smallCameraType, logType, files, route, showPath, routeName, unitFormat],
  )
  return props
}

export const Component = () => {
  const { routeName, routeId } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [location, setLocation] = useState<{ start?: string; end?: string }>()
  const previewProps = usePreviewProps()
  const { call } = useDevice()

  useEffect(() => {
    if (route) getStartEndPlaceName(route).then(setLocation)
  }, [route])

  useEffect(() => {
    call?.('setRouteViewed', { route: routeId })
  }, [routeId, call])

  if (!route) return null

  return (
    <>
      <TopAppBar>
        <span>{location ? getLocationText(location) : 'Drive details'}</span>
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
