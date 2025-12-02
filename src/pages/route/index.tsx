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
import { DetailRow } from '../../components/DetailRow'

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

      <div className="flex flex-col gap-6 px-4 md:px-8 py-4 pb-10 max-w-screen-xl w-full">
        <div className="md:grid md:grid-cols-3 md:gap-6 flex flex-col gap-6">
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Video Player */}
            <div className="overflow-hidden rounded-xl shadow-lg bg-black">
              <RouteVideoPlayer playerRef={playerRef} />
            </div>

            {/* Files */}
            <div className="bg-background-alt rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Files</h3>
              <RouteFiles route={route} />
            </div>
          </div>

          <div className="md:col-span-1 flex flex-col gap-6">
            {/* Map */}
            <div className="aspect-square overflow-hidden rounded-2xl shadow-lg">
              <StaticMap route={route} />
            </div>

            {/* Statistics */}
            <div className="bg-background-alt rounded-xl overflow-hidden">
              <Stats className="p-5" route={route} />
            </div>

            {/* Actions */}
            <Actions route={route} />

            {/* Details Card */}
            <div className="bg-background-alt rounded-xl p-4 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Details</h3>
              <DetailRow label="Route" value={routeName.replace('|', '/')} mono copyable />
              <DetailRow label="Vehicle" value={route.make || route.platform} copyable />
              <DetailRow label="Dongle ID" value={route.dongle_id} mono copyable />
              <DetailRow label="Version" value={route.version} mono copyable />
              <DetailRow label="Git Branch" value={route.git_branch} mono copyable />
              <DetailRow label="Git Commit" value={route.git_commit?.substring(0, 7)} mono copyable />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
