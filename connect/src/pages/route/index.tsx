import { RouteFiles } from '../../components/RouteFiles'
import { RouteVideoPlayer, VideoControls } from '../../components/VideoPlayer'
import { useFiles } from '../../api/queries'
import { api } from '../../api'
import { useEffect, useMemo, useState } from 'react'
import { useRouteParams } from '../../utils/hooks'
import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { useAthena } from '../../api/athena'
import { getStartEndPlaceName } from '../../utils/map'
import { DynamicMap } from './Map'
import { Stats } from './Stats'
import { Actions } from './Actions'
import { formatDate, formatTime } from '../../utils/format'
import { Info } from './Info'
import { useStorage } from '../../utils/storage'
import { PreviewProps } from '../../types'

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
  const [largeCameraType] = useStorage('largeCameraType')
  const [smallCameraType] = useStorage('smallCameraType')
  const [logType] = useStorage('logType')
  const [unitFormat] = useStorage('unitFormat')
  const [showPath] = useStorage('showPath')

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
    [largeCameraType, smallCameraType, logType, files, route, showPath],
  )
  return props
}

export const Component = () => {
  const { routeName, dongleId, date } = useRouteParams()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [location, setLocation] = useState<{ start?: string; end?: string }>()
  const previewProps = usePreviewProps()
  const athena = useAthena()
  useEffect(() => {
    if (route) getStartEndPlaceName(route).then(setLocation)
  }, [route])

  useEffect(() => {
    athena('setRouteViewed', { route: date })
  }, [date, dongleId])

  if (!route) return null

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton href={`/${route.dongle_id}`} />}>
        <span>{location ? getLocationText(location) : 'Drive details'}</span>
        {route.start_time && (
          <span className="text-xs md:text-sm font-medium text-white/60">
            {formatDate(route.start_time)} {formatTime(route.start_time)}
          </span>
        )}
      </TopAppBar>

      <div className="grid md:grid-cols-3 gap-3 md:gap-4 p-4 max-w-screen-xl mx-auto">
        <RouteVideoPlayer className="md:col-span-2 md:order-1" props={previewProps} />
        <VideoControls className="md:col-span-2 md:order-3" />
        <Stats route={route} className="md:order-6" />
        <Actions route={route} className="md:order-4" />
        <RouteFiles route={route} className="md:col-span-2 md:row-span-3 md:order-5" />
        <DynamicMap route={route} className="md:order-2" />
        <Info route={route} className="md:order-7" />
      </div>
    </div>
  )
}
