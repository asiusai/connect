import type { RouteStatistics } from '~/api/derived'
import type { Route } from '~/api/types'
import { formatDistance, formatDuration, formatRouteDuration } from '~/utils/format'
import { StatisticBar } from './StatisticBar'
import { Resource } from '~/fix'

const formatEngagement = (statistics: RouteStatistics | undefined): string | undefined => {
  if (!statistics || statistics.routeDurationMs === 0) return undefined
  const { engagedDurationMs, routeDurationMs } = statistics
  return `${(100 * (engagedDurationMs / routeDurationMs)).toFixed(0)}%`
}

export const RouteStatisticsBar = (props: { className?: string; route: Route | undefined; statistics: Resource<RouteStatistics> }) => {
  return (
    <StatisticBar
      className={props.className}
      statistics={[
        { label: 'Distance', value: () => formatDistance(props.route?.distance) },
        {
          label: 'Duration',
          value: () =>
            props.statistics.state === 'ready' || props.statistics.state === 'refreshing'
              ? formatDuration(props.statistics().routeDurationMs / (60 * 1000))
              : formatRouteDuration(props.route),
        },
        { label: 'Engaged', value: () => formatEngagement(props.statistics()) },
      ]}
    />
  )
}
