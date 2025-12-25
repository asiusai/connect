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
      title: 'Settings',
      icon: 'settings',
      href: `/${dongleId}/settings`,
      color: 'text-yellow-400',
    },
  ]
  return (
    <div className={clsx('grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-2', className)}>
      {items
        .filter((x) => !x.hide)
        .map(({ title, href, icon, color }, i, arr) => (
          <ButtonBase
            key={title}
            href={href}
            disabled={!href}
            className={clsx(
              'group flex md:flex-row items-center gap-3 md:gap-3 p-4 md:px-3 md:py-3 rounded-xl md:rounded-lg transition-all font-medium',
              'bg-background-alt/50 md:bg-transparent border border-white/5 md:border-0',
              href && 'hover:bg-white/10 md:hover:bg-white/5 hover:border-white/10 text-white hover:scale-[1.02] md:hover:scale-100 active:scale-[0.98]',
              title === 'Home' && 'hidden md:flex',
              i === arr.length - 1 && i % 2 !== 0 && 'justify-center col-span-2 md:col-span-1 md:justify-start',
            )}
          >
            <div className={clsx('flex items-center justify-center rounded-lg p-2 transition-all', color.replace('text-', 'bg-').replace('400', '500/10').replace('500', '500/10'))}>
              <Icon name={icon as any} className={clsx('text-2xl md:text-xl', color)} />
            </div>
            <span className="text-sm md:text-base">{title}</span>
          </ButtonBase>
        ))}
    </div>
  )
}
