import { RouteFiles } from '../../components/RouteFiles'
import { RouteVideoPlayer } from '../../components/VideoPlayer'
import { useProfile, useRoute } from '../../api/queries'
import { useEffect, useRef, useState } from 'react'
import { PlayerRef } from '@remotion/player'
import { Route } from '../../types'
import { useRouteParams } from '../../utils/hooks'
import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import { callAthena } from '../../api/athena'
import { getPlaceName } from '../../utils/map'
import { StaticMap } from './StaticMap'
import { Stats } from './Stats'
import { Actions } from './Actions'
import { formatDate } from '../../utils/format'
import { Info } from './Info'

const getLocation = async (route: Route) => {
  const startPos = [route.start_lng || 0, route.start_lat || 0]
  const endPos = [route.end_lng || 0, route.end_lat || 0]
  const startPlace = await getPlaceName(startPos)
  const endPlace = await getPlaceName(endPos)
  if (!startPlace && !endPlace) return 'Drive Details'
  if (!endPlace || startPlace === endPlace) return `Drive in ${startPlace}`
  if (!startPlace) return `Drive in ${endPlace}`
  return `${startPlace} to ${endPlace}`
}

export const Component = () => {
  const playerRef = useRef<PlayerRef>(null)
  const { routeName, dongleId, date } = useRouteParams()

  const [route] = useRoute(routeName)
  const [profile] = useProfile()
  const [title, setTitle] = useState('Drive Details')

  useEffect(() => {
    if (route) getLocation(route).then(setTitle)
  }, [route])

  const isOwner = route && profile && route.user_id === profile.id
  useEffect(() => {
    if (isOwner) callAthena({ type: 'setRouteViewed', dongleId, params: { route: date } })
  }, [isOwner, date, dongleId])

  if (!route) return null

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton fallback={`/${route.dongle_id}`} />}>
        <span>{title}</span>
        <span className="text-xs md:text-sm font-medium text-white/60">{formatDate(route.start_time!)}</span>
      </TopAppBar>

      <div className="grid md:grid-cols-3 gap-4 p-4 max-w-screen-xl">
        <RouteVideoPlayer playerRef={playerRef} className="md:col-span-2 md:row-span-5 md:order-1" />
        <Stats route={route} className="md:order-3" />
        <Actions route={route} className="md:order-5" />
        <RouteFiles route={route} className="md:col-span-2 md:row-span-3 md:order-4" />
        <StaticMap route={route} className="md:row-span-4 md:order-2" />
        <Info route={route} className="md:order-6" />
      </div>
    </div>
  )
}
