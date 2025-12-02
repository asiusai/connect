import { useEffect, useState } from 'react'
import { Route } from '../../types'
import { Icon } from '../../components/Icon'
import clsx from 'clsx'
import { usePreservedRoutes, useProfile } from '../../api/queries'
import { api } from '../../api'

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

export const Actions = ({ route }: { route: Route }) => {
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
