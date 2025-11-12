import { formatDistance, formatDuration } from '~/utils/format'
import { StatisticBar } from './StatisticBar'
import { api } from '~/api'

export const DeviceStatistics = ({ dongleId, className }: { className?: string; dongleId: string }) => {
  const stats = api.devices.stats.useQuery(['stats', dongleId], { params: { dongleId } })
  const allTime = stats.data?.body.all

  return (
    <StatisticBar
      className={className}
      statistics={[
        { label: 'Distance', value: () => formatDistance(allTime?.distance) },
        { label: 'Duration', value: () => formatDuration(allTime?.minutes) },
        { label: 'Routes', value: () => allTime?.routes },
      ]}
    />
  )
}
