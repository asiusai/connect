import clsx from 'clsx'
import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import { useRouteParams } from '../../utils/hooks'

export const Navigation = () => {
  const { dongleId } = useRouteParams()
  return (
    <div className="grid grid-cols-2 md:grid-cols-1 ">
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
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
            href ? 'hover:bg-white/10 text-white' : 'opacity-50 cursor-not-allowed text-white/60',
          )}
        >
          <Icon name={icon as any} className={clsx('text-lg', color)} />
          <span>{title}</span>
        </ButtonBase>
      ))}
    </div>
  )
}
