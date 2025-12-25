import { useStats } from '../../api/queries'
import { Slider } from '../../components/Slider'
import { Icon } from '../../components/Icon'
import { formatDistance, formatDuration } from '../../utils/format'
import { useRouteParams } from '../../utils/hooks'
import clsx from 'clsx'
import { useStorage } from '../../utils/storage'

const StatCard = ({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: string
  label: string
  value: string
  iconColor: string
  iconBg: string
}) => (
  <div className="flex items-center gap-4 p-4 bg-background-alt/50 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
    <div className={clsx('flex items-center justify-center rounded-xl p-3', iconBg)}>
      <Icon name={icon as any} className={clsx('text-2xl', iconColor)} />
    </div>
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold text-white truncate">{value}</span>
    </div>
  </div>
)

export const Stats = ({ className }: { className: string }) => {
  const { dongleId } = useRouteParams()
  const [stats] = useStats(dongleId)
  const [timeRange, setTimeRange] = useStorage('statsTime')

  if (!stats) return null

  const currentStats = stats[timeRange]
  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold">Statistics</h2>
        <Slider options={{ all: 'All', week: 'Weekly' }} value={timeRange} onChange={setTimeRange} />
      </div>
      <div className="flex flex-col gap-3">
        <StatCard
          icon="map"
          label="Distance"
          value={formatDistance(currentStats.distance) || '0 km'}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          icon="schedule"
          label="Time"
          value={formatDuration(currentStats.minutes) || '0h'}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          icon="route"
          label="Drives"
          value={currentStats.routes.toString()}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
        />
      </div>
    </div>
  )
}
