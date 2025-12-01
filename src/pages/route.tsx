import { dayjs } from '../utils/format'
import { RouteStatisticsBar } from '../components/RouteStatisticsBar'
import { RouteFiles } from '../components/RouteFiles'
import { RouteVideoPlayer } from '../components/RouteVideoPlayer'
import { useFiles, usePreservedRoutes, useProfile, useRoute } from '../api/queries'
import { useEffect, useRef, useState } from 'react'
import { PlayerRef } from '@remotion/player'
import { api } from '../api'
import { Route } from '../types'
import { useParams } from '../utils/hooks'
import { Icon } from '../components/material/Icon'
import { TopAppBar } from '../components/material/TopAppBar'
import { BackButton } from '../components/material/BackButton'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { callAthena } from '../api/athena'
import { RouteStaticMap } from '../components/RouteStaticMap'

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

// TODO: get start time from URL ?t=
export const Component = () => {
  const navigate = useNavigate()
  const playerRef = useRef<PlayerRef>(null)
  const { routeName, dongleId, date } = useParams()

  const [route] = useRoute(routeName)
  const [files] = useFiles(routeName)
  const [profile] = useProfile()

  const ifIsOwner = route && profile && route.user_id === profile.id
  useEffect(() => {
    if (ifIsOwner) callAthena({ type: 'setRouteViewed', dongleId, params: { route: date } })
  }, [ifIsOwner])

  if (!route) return null

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton fallback={`/${route.dongle_id}/routes`} />}>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight">Drive Details</span>
          <span className="text-xs font-medium text-white/60 leading-tight">{formatDate(route.start_time!)}</span>
        </div>
      </TopAppBar>

      <div className="flex flex-col gap-6 px-4 py-4 pb-10">
        {/* Video Player */}
        <div className="overflow-hidden rounded-xl shadow-lg bg-black">
          <RouteVideoPlayer playerRef={playerRef} />
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

        {/* Files */}
        <div className="bg-background-alt rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Files</h3>
          <RouteFiles route={route} />
        </div>

        {/* Map */}
        <div className="aspect-square overflow-hidden rounded-2xl shadow-lg">
          <RouteStaticMap route={route} />
        </div>
      </div>
    </div>
  )
}
