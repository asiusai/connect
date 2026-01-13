import { api } from '../../api'
import { Slider } from '../../components/Slider'
import { DetailRow } from '../../components/DetailRow'
import { formatDistance, formatDuration } from '../../utils/format'
import { useRouteParams } from '../../utils/hooks'
import clsx from 'clsx'
import { useStorage } from '../../utils/storage'

export const Stats = ({ className }: { className: string }) => {
  const { dongleId } = useRouteParams()
  const [stats] = api.device.stats.useQuery({ params: { dongleId } })
  const [timeRange, setTimeRange] = useStorage('statsTime')

  const currentStats = stats?.[timeRange ?? 'all']
  if (!currentStats) return null
  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Statistics</h2>
        <Slider options={{ all: 'All', week: 'Weekly' }} value={timeRange} onChange={setTimeRange} />
      </div>
      <div className="bg-background-alt rounded-xl px-4 py-3 flex flex-col">
        <DetailRow label="Distance" value={formatDistance(currentStats.distance)} />
        <DetailRow label="Time" value={formatDuration(currentStats.minutes)} />
        <DetailRow label="Drives" value={currentStats.routes.toString()} />
      </div>
    </div>
  )
}
