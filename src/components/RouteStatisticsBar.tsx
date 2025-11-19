import { generateRouteStatistics, getTimelineEvents, type RouteStatistics } from '../utils/derived'
import type { Route } from '../types'
import { formatDistance, formatDuration, formatRouteDuration } from '../utils/format'
import { StatisticBar } from './StatisticBar'
import { useState, useEffect } from 'react'

const formatEngagement = (stats?: RouteStatistics) =>
  !stats?.routeDurationMs ? undefined : `${(100 * (stats.engagedDurationMs / stats.routeDurationMs)).toFixed(0)}%`

const useTimelineEvents = (route: Route) => {
  const [stats, setStats] = useState<RouteStatistics>()
  useEffect(() => {
    getTimelineEvents(route).then((x) => setStats(generateRouteStatistics(route, x)))
  }, [route])
  return stats
}

export const RouteStatisticsBar = ({ className, route }: { className?: string; route: Route }) => {
  const stats = useTimelineEvents(route)

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
