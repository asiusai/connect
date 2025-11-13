import type { RouteStatistics } from '~/api/derived'
import type { Route } from '~/api/types'
import { formatDistance, formatDuration, formatRouteDuration } from '~/utils/format'
import { StatisticBar } from './StatisticBar'

const formatEngagement = (stats: RouteStatistics | undefined): string | undefined => {
  if (!stats || stats.routeDurationMs === 0) return undefined
  return `${(100 * (stats.engagedDurationMs / stats.routeDurationMs)).toFixed(0)}%`
}

export const RouteStatisticsBar = ({
  stats,
  className,
  route,
}: {
  className?: string
  route: Route | undefined
  stats: RouteStatistics | undefined
}) => {
  return (
    <StatisticBar
      className={className}
      stats={[
        { label: 'Distance', value: formatDistance(route?.distance) },
        { label: 'Duration', value: stats ? formatDuration(stats.routeDurationMs / (60 * 1000)) : formatRouteDuration(route) },
        { label: 'Engaged', value: formatEngagement(stats) },
      ]}
    />
  )
}
