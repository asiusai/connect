import clsx from 'clsx'
import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import { useRouteParams } from '../../utils/hooks'

export const Navigation = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  return (
    <div className={clsx('grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-0', className)}>
      {[
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
      ].map(({ title, href, icon, color }) => (
        <ButtonBase
          key={title}
          href={href}
          disabled={!href}
          className={clsx(
            'flex md:flex-row bg-background-alt md:bg-transparent items-center p-4 gap-4 md:gap-3 md:px-3 md:py-2  rounded-lg transition-colors font-medium',
            href && 'hover:bg-white/10 text-white',
            title === 'Home' && 'hidden md:flex',
          )}
        >
          <Icon name={icon as any} className={clsx('text-xl md:text-2xl', color)} />
          <span>{title}</span>
        </ButtonBase>
      ))}
    </div>
  )
}
