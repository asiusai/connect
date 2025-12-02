import clsx from 'clsx'
import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import { useRouteParams } from '../../utils/hooks'

export const ActionBar = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  return (
    <div className={clsx('grid grid-cols-4 gap-2', className)}>
      {[
        { name: 'power_settings_new', label: 'Shutdown' },
        { name: 'home', label: 'Navigate to Home' },
        { name: 'work', label: 'Navigate to Work' },
        { name: 'camera', label: 'Take snapshot', href: `/${dongleId}/sentry?instant=1` },
      ].map(({ label, name, href }) => (
        <ButtonBase
          key={name}
          href={href}
          disabled={!href}
          className={clsx(
            'flex items-center justify-center aspect-square rounded-lg bg-background-alt transition-colors border border-white/5 text-white/80 ',
            href && 'hover:bg-white/10 hover:text-white',
          )}
          title={label}
        >
          <Icon name={name as any} className="text-xl" />
        </ButtonBase>
      ))}
    </div>
  )
}
