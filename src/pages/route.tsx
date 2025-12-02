import { dayjs } from '../utils/format'
import { RouteFiles } from '../components/RouteFiles'
import { RouteVideoPlayer } from '../components/VideoPlayer'
import { useFiles, usePreservedRoutes, useProfile, useRoute } from '../api/queries'
import { useEffect, useRef, useState } from 'react'
import { PlayerRef } from '@remotion/player'
import { api } from '../api'
import { Route } from '../types'
import { useParams } from '../utils/hooks'
import { Icon } from '../components/Icon'
import { TopAppBar } from '../components/TopAppBar'
import { BackButton } from '../components/BackButton'
import clsx from 'clsx'
import { callAthena } from '../api/athena'
import { getPlaceName } from '../utils/map'
import { generateRouteStatistics, getTimelineEvents, type RouteStatistics } from '../utils/derived'
import { formatDistance, formatDuration, formatRouteDuration } from '../utils/format'
import { getCoords } from '../utils/derived'
import { Coord, getPathStaticMapUrl } from '../utils/map'
import { Loading } from '../components/Loading'

const formatDate = (date: string) => dayjs(date).format('ddd, MMM D, YYYY h:mm A')

const useIsPreserved = (route: Route) => {
  const [profile] = useProfile()
  const [preserved] = usePreservedRoutes(route.dongle_id, route.user_id === profile?.id)
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

const formatEngagement = (stats?: RouteStatistics) =>
  !stats?.routeDurationMs ? undefined : `${(100 * (stats.engagedDurationMs / stats.routeDurationMs)).toFixed(0)}%`

const useTimelineEvents = (route: Route) => {
  const [stats, setStats] = useState<RouteStatistics>()
  useEffect(() => {
    getTimelineEvents(route).then((x) => setStats(generateRouteStatistics(route, x)))
  }, [route])
  return stats
}

const RouteStaticMap = ({ route, className }: { className?: string; route?: Route }) => {
  const [image, setImage] = useState<string>()

  useEffect(() => {
    if (!route) return
    const fn = async () => {
      const coords = await getCoords(route)
      if (!coords.length) return
      const paths: Coord[] = coords.map(({ lng, lat }) => [lng, lat])
      const url = getPathStaticMapUrl('dark', paths, 512, 512, true)
      const image = await new Promise<string>((resolve, reject) => {
        const image = new Image()
        image.src = url
        image.onload = () => resolve(url)
        image.onerror = (error) => reject(new Error('Failed to load image', { cause: error }))
      })
      setImage(image)
    }
    fn()
  }, [route])

  return (
    <div className={clsx('relative isolate flex h-full flex-col justify-end self-stretch bg-surface text-background-x', className)}>
      {image ? <img className="pointer-events-none size-full object-cover" src={image} /> : <Loading className="size-full" />}
    </div>
  )
}

export const RouteStatisticsBar = ({ className, route }: { className?: string; route: Route }) => {
  const stats = useTimelineEvents(route)

  return (
    <div className="flex flex-col">
      <div className={clsx('flex h-auto w-full justify-between gap-8', className)}>
        {[
          { label: 'Distance', value: formatDistance(route?.distance) },
          { label: 'Duration', value: stats ? formatDuration(stats.routeDurationMs / (60 * 1000)) : formatRouteDuration(route) },
          { label: 'Engaged', value: formatEngagement(stats) },
        ]?.map((stat) => (
          <div key={stat.label} className="flex basis-0 grow flex-col justify-between">
            <span className="text-sm text-background-alt-x">{stat.label}</span>
            <span className="font-mono text-sm">{stat.value?.toString() ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ActionButton = ({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: string
  label: string
  active?: boolean
  onClick: () => void
  disabled?: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      'flex flex-1 flex-col items-center justify-center gap-2 rounded-xl p-3 transition-all active:scale-95',
      active ? 'bg-white text-black' : 'bg-background-alt text-white hover:bg-background-alt/80',
      disabled && 'opacity-50 cursor-not-allowed',
    )}
  >
    <Icon name={icon as any} className={clsx('text-2xl', active ? 'text-black' : 'text-white')} />
    <span className="text-xs font-medium">{label}</span>
  </button>
)

const RouteActions = ({ route }: { route: Route }) => {
  const [isPreserved, setIsPreserved] = useIsPreserved(route)
  const [isPublic, setIsPublic] = useIsPublic(route)
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <ActionButton
        icon={isPreserved ? 'bookmark_check' : 'bookmark'}
        label={isPreserved ? 'Preserved' : 'Preserve'}
        active={isPreserved}
        onClick={() => setIsPreserved(!isPreserved)}
        disabled={isPreserved === undefined}
      />
      <ActionButton
        icon={isPublic ? 'public' : 'public_off'}
        label={isPublic ? 'Public' : 'Private'}
        active={isPublic}
        onClick={() => setIsPublic(!isPublic)}
      />
      <ActionButton icon={copied ? 'check' : 'share'} label={copied ? 'Copied' : 'Share'} onClick={handleShare} />
    </div>
  )
}

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
  const [files] = useFiles(routeName)
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
              <RouteStaticMap route={route} />
            </div>

            {/* Statistics */}
            <div className="bg-background-alt rounded-xl overflow-hidden">
              <RouteStatisticsBar className="p-5" route={route} />
            </div>

            {/* Actions */}
            <RouteActions route={route} />

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
