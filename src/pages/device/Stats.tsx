import { useState } from 'react'
import { useStats } from '../../api/queries'
import { Slider } from '../../components/Slider'
import { DetailRow } from '../../components/DetailRow'
import { formatDistance, formatDuration } from '../../utils/format'
import { useRouteParams } from '../../utils/hooks'

export const Stats = () => {
  const { dongleId } = useRouteParams()
  const [stats] = useStats(dongleId)
  const [timeRange, setTimeRange] = useState<'week' | 'all'>('all')

  if (!stats) return null

  const currentStats = stats[timeRange]
  return (
    <div className="flex flex-col gap-4">
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
