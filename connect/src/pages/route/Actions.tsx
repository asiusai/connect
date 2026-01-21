import { useEffect, useState } from 'react'
import { Route } from '../../../../shared/types'
import { Icon } from '../../components/Icon'
import clsx from 'clsx'
import { api } from '../../api'
import { useIsDeviceOwner, useRouteParams } from '../../utils/hooks'
import { env } from '../../../../shared/env'

const useIsPreserved = (route: Route, isOwner: boolean) => {
  const [preserved] = api.routes.preserved.useQuery({ params: { dongleId: route.dongle_id }, enabled: isOwner })
  const [isPreserved, setIsPreserved] = useState<boolean>()
  useEffect(() => setIsPreserved(preserved ? preserved.some((p) => p.fullname === route.fullname) : undefined), [preserved, route.fullname])
  return [
    isPreserved,
    async (isPreserved: boolean) => {
      setIsPreserved(isPreserved)
      isPreserved
        ? await api.route.preserve.mutate({ params: { routeName: route.fullname }, query: {} })
        : await api.route.unPreserve.mutate({ params: { routeName: route.fullname }, query: {} })
    },
  ] as const
}

const useIsPublic = (route: Route) => {
  const [isPublic, setIsPublic] = useState(route.is_public)
  return [
    isPublic,
    async (isPublic: boolean) => {
      await api.route.setPublic.mutate({ body: { is_public: isPublic }, params: { routeName: route.fullname }, query: {} })
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

export const Actions = ({ route, className }: { route: Route; className?: string }) => {
  const { routeName } = useRouteParams()
  const isOwner = useIsDeviceOwner()
  const [isPreserved, setIsPreserved] = useIsPreserved(route, isOwner)
  const [isPublic, setIsPublic] = useIsPublic(route)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    let url = `${window.location.protocol}//${window.location.host}/${routeName}`

    // Use signature when route is private. Doesn't work with comma API
    if (!route.is_public && env.MODE !== 'comma') {
      const res = await api.route.shareSignature.query({ params: { routeName: routeName.replace('/', '|') }, query: {} })
      if (res.body) url = url + `?sig=${res.body.sig}&exp=${res.body.exp}`
    }

    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={clsx('grid grid-cols-3 gap-3', className)}>
      <ActionButton
        icon={isPreserved ? 'bookmark_check' : 'bookmark'}
        label={isPreserved ? 'Preserved' : 'Preserve'}
        active={isPreserved}
        onClick={() => setIsPreserved(!isPreserved)}
        disabled={!isOwner}
      />
      <ActionButton
        icon={isPublic ? 'public' : 'public_off'}
        label={isPublic ? 'Public' : 'Private'}
        active={isPublic}
        onClick={() => setIsPublic(!isPublic)}
        disabled={!isOwner}
      />
      <ActionButton icon={copied ? 'check' : 'share'} label={copied ? 'Copied' : 'Share'} onClick={handleShare} />
    </div>
  )
}
