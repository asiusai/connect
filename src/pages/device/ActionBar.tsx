import { ButtonBase } from '../../components/ButtonBase'
import { Icon } from '../../components/Icon'
import { useParams } from '../../utils/hooks'

export const getActionItems = (dongleId: string) => [
  { name: 'power_settings_new', label: 'Shutdown' },
  { name: 'home', label: 'Home' },
  { name: 'work', label: 'Work' },
  { name: 'camera', label: 'Snapshot', href: `/${dongleId}/sentry?instant=1` },
]

export const ActionBar = () => {
  const { dongleId } = useParams()
  return (
    <div className="flex items-center justify-center gap-6 px-4 pb-4">
      {getActionItems(dongleId).map(({ name, href }) => (
        <ButtonBase
          key={name}
          href={href}
          disabled={!href}
          className="flex pointer-events-auto items-center justify-center w-12 h-12 rounded-full bg-background-alt hover:bg-background shadow-md transition-all border border-white/5 active:scale-95"
        >
          <Icon name={name as any} className="text-white text-2xl" />
        </ButtonBase>
      ))}
    </div>
  )
}
