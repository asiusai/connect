import { getDeviceStats } from '~/api/devices'
import { formatDistance, formatDuration } from '~/utils/format'
import { StatisticBar } from './StatisticBar'
import { createResource } from '~/fix'

export const DeviceStatistics = (props: { className?: string; dongleId: string }) => {
  const [statistics] = createResource(props.dongleId, getDeviceStats)
  const allTime = statistics.data?.all

  return (
    <StatisticBar
      className={props.className}
      statistics={[
        { label: 'Distance', value: () => formatDistance(allTime?.distance) },
        { label: 'Duration', value: () => formatDuration(allTime?.minutes) },
        { label: 'Routes', value: () => allTime?.routes },
      ]}
    />
  )
}
