import clsx from 'clsx'
import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import { useParams } from '../../utils/hooks'

export const getNavigationItems = (dongleId: string) => [
  {
    title: 'Home',
    subtitle: `View routes`,
    icon: 'home',
    href: `/${dongleId}`,
    color: 'text-blue-400',
  },
  {
    title: 'Sentry',
    subtitle: 'View clips',
    icon: 'photo_camera',
    href: `/${dongleId}/sentry`,
    color: 'text-red-400',
  },
  {
    title: 'Actions',
    subtitle: 'Trigger controls',
    icon: 'infrared',
    color: 'text-zinc-500',
  },
  {
    title: 'Teleop',
    subtitle: 'Remote control',
    icon: 'gamepad',
    color: 'text-zinc-500',
  },
  {
    title: 'Settings',
    subtitle: 'Device config',
    icon: 'settings',
    href: `/${dongleId}/settings`,
    color: 'text-yellow-400',
  },
]

export const Navigation = () => {
  const { dongleId } = useParams()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {getNavigationItems(dongleId).map(({ title, href, icon, subtitle, color }) => (
        <ButtonBase
          key={title}
          href={href}
          disabled={!href}
          className={clsx(
            'flex flex-col gap-3 p-4 bg-background-alt text-left rounded-xl transition-all active:scale-[0.98]',
            href ? 'hover:bg-background-alt/80' : 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className={clsx('h-10 w-10 rounded-full flex items-center justify-center bg-white/5', color)}>
            <Icon name={icon as any} className="text-2xl" />
          </div>
          <div>
            <div className="text-lg font-medium text-white">{title}</div>
            {subtitle && <div className="text-xs text-white/60 font-medium">{subtitle}</div>}
          </div>
        </ButtonBase>
      ))}
    </div>
  )
}
