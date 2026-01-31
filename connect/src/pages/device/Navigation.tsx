import { cn } from '../../../../shared/helpers'
import { ButtonBase } from '../../components/ButtonBase'
import { useRouteParams } from '../../hooks'
import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'
import { useSettings } from '../../hooks/useSettings'
import { BarChart3Icon, CameraIcon, HomeIcon, LucideIcon, SettingsIcon, TerminalIcon, ToggleLeftIcon, VideoIcon } from 'lucide-react'

export const Navigation = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const isOwner = useIsDeviceOwner()
  const { usingAsiusPilot } = useSettings()

  const items: { title: string; icon: LucideIcon; href: string; color: string; disabled?: boolean; hide?: boolean }[] = [
    {
      title: 'Home',
      icon: HomeIcon,
      href: `/${dongleId}`,
      color: 'text-blue-400',
    },
    {
      title: 'Snapshot',
      icon: CameraIcon,
      href: `/${dongleId}/snapshot`,
      color: 'text-orange-400',
      disabled: !isOwner,
    },
    {
      title: 'Live',
      icon: VideoIcon,
      href: `/${dongleId}/live`,
      color: 'text-red-400',
      hide: !usingAsiusPilot,
      disabled: !isOwner,
    },
    {
      title: 'Params',
      icon: ToggleLeftIcon,
      href: `/${dongleId}/params`,
      color: 'text-purple-400',
      hide: !usingAsiusPilot,
      disabled: !isOwner,
    },
    {
      title: 'Analyze',
      icon: BarChart3Icon,
      href: `/${dongleId}/analyze`,
      color: 'text-green-500',
      disabled: !isOwner,
    },
    {
      title: 'SSH',
      icon: TerminalIcon,
      href: `/${dongleId}/ssh`,
      color: 'text-cyan-400',
      disabled: !isOwner,
    },
    {
      title: 'Settings',
      icon: SettingsIcon,
      href: `/${dongleId}/settings`,
      color: 'text-yellow-400',
    },
  ]
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-0', className)}>
      {items
        .filter((x) => !x.hide)
        .map(({ title, href, icon: Icon, color, disabled }, i, arr) => (
          <ButtonBase
            key={title}
            href={disabled ? undefined : href}
            disabled={disabled || !href}
            title={'You must be the owner to access this'}
            className={cn(
              'flex md:flex-row bg-background-alt md:bg-transparent items-center p-4 gap-4 md:gap-3 md:px-3 md:py-3  rounded-lg transition-colors font-medium',
              disabled ? 'opacity-50 cursor-not-allowed' : href && 'hover:bg-white/10 text-white',
              title === 'Home' && 'hidden md:flex',
              i === arr.length - 1 && i % 2 !== 0 && 'justify-center col-span-2 md:col-span-1 md:justify-start',
            )}
          >
            <Icon className={cn('text-xl md:text-2xl', color)} />
            <span>{title}</span>
          </ButtonBase>
        ))}
    </div>
  )
}
