import clsx from 'clsx'
import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import { useRouteParams } from '../../utils/hooks'
import { useStorage } from '../../utils/storage'

export const Navigation = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const [usingCorrectFork] = useStorage('usingCorrectFork')

  const items = [
    {
      title: 'Home',
      icon: 'home',
      href: `/${dongleId}`,
      color: 'text-blue-400',
    },
    {
      title: 'Sentry',
      icon: 'photo_camera',
      href: `/${dongleId}/sentry`,
      color: 'text-red-400',
    },
    {
      title: 'Live',
      icon: 'play_arrow',
      href: `/${dongleId}/live`,
      color: 'text-orange-400',
      hide: !usingCorrectFork,
    },
    {
      title: 'Params',
      icon: 'switches',
      href: `/${dongleId}/params`,
      color: 'text-purple-400',
      hide: !usingCorrectFork,
    },
    {
      title: 'Analyze',
      icon: 'bar_chart',
      href: `/${dongleId}/analyze`,
      color: 'text-green-500',
    },
    {
      title: 'SSH',
      icon: 'terminal',
      href: `/${dongleId}/ssh`,
      color: 'text-cyan-400',
    },
    {
      title: 'Settings',
      icon: 'settings',
      href: `/${dongleId}/settings`,
      color: 'text-yellow-400',
    },
  ]
  return (
    <div className={clsx('grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-0', className)}>
      {items
        .filter((x) => !x.hide)
        .map(({ title, href, icon, color }, i, arr) => (
          <ButtonBase
            key={title}
            href={href}
            disabled={!href}
            className={clsx(
              'flex md:flex-row bg-background-alt md:bg-transparent items-center p-4 gap-4 md:gap-3 md:px-3 md:py-2  rounded-lg transition-colors font-medium',
              href && 'hover:bg-white/10 text-white',
              title === 'Home' && 'hidden md:flex',
              i === arr.length - 1 && i % 2 !== 0 && 'justify-center col-span-2 md:col-span-1 md:justify-start',
            )}
          >
            <Icon name={icon as any} className={clsx('text-xl md:text-2xl', color)} />
            <span>{title}</span>
          </ButtonBase>
        ))}
    </div>
  )
}
