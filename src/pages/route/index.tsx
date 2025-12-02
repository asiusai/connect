import { RouteFiles } from '../../components/RouteFiles'
import { RouteVideoPlayer } from '../../components/VideoPlayer'
import { useFiles, useProfile, useRoute } from '../../api/queries'
import { useEffect, useRef, useState } from 'react'
import { PlayerRef } from '@remotion/player'
import { Route } from '../../types'
import { useParams } from '../../utils/hooks'
import { Icon } from '../../components/Icon'
import { TopAppBar } from '../../components/TopAppBar'
import { BackButton } from '../../components/BackButton'
import clsx from 'clsx'
import { callAthena } from '../../api/athena'
import { getPlaceName } from '../../utils/map'
import { StaticMap } from './StaticMap'
import { Stats } from './Stats'
import { Actions } from './Actions'
import { formatDate } from '../../utils/format'

const DetailRow = ({
  label,
  value,
  mono,
  copyable,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  copyable?: boolean
}) => {
  const [copied, setCopied] = useState(false)

  if (!value) return null

  const handleCopy = () => {
    if (!copyable) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-4',
        copyable && 'cursor-pointer hover:bg-white/5 -mx-2 px-2 transition-colors rounded-lg',
      )}
      onClick={handleCopy}
    >
      <span className="text-sm text-white/60 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0 justify-end">
        <span className={clsx('font-medium text-white truncate', mono ? 'font-mono text-xs' : 'text-sm')}>{value}</span>
        {copyable && (
          <Icon
            name={copied ? 'check' : 'file_copy'}
            className={clsx('text-[14px] shrink-0', copied ? 'text-green-400' : 'text-white/20')}
          />
        )}
      </div>
    </div>
  )
}

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
  const { routeName, dongleId, date } = useParams()

  const [route] = useRoute(routeName)
  const [profile] = useProfile()
  const [title, setTitle] = useState('Drive Details')

  useEffect(() => {
    if (route) getLocation(route).then(setTitle)
  }, [route])

  const ifIsOwner = route && profile && route.user_id === profile.id
  useEffect(() => {
    if (ifIsOwner) callAthena({ type: 'setRouteViewed', dongleId, params: { route: date } })
  }, [ifIsOwner])

  if (!route) return null

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="md:hidden">
        <TopAppBar leading={<BackButton fallback={`/${route.dongle_id}`} />}>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">{title}</span>
            <span className="text-xs font-medium text-white/60 leading-tight">{formatDate(route.start_time!)}</span>
          </div>
        </TopAppBar>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center gap-4 px-8 py-6">
        <BackButton fallback={`/${route.dongle_id}`} />
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <span className="text-sm font-medium text-white/60">{formatDate(route.start_time!)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 md:px-8 py-4 pb-10 max-w-7xl w-full">
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 flex flex-col gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
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

          {/* Right Column */}
          <div className="lg:col-span-1 flex flex-col gap-6">
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
