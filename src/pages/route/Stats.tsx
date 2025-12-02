import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { RouteStatistics, getTimelineEvents, generateRouteStatistics } from '../../utils/derived'
import { formatDistance, formatDuration, formatRouteDuration } from '../../utils/format'
import { Route } from '../../types'

const formatEngagement = (stats?: RouteStatistics) =>
  !stats?.routeDurationMs ? undefined : `${(100 * (stats.engagedDurationMs / stats.routeDurationMs)).toFixed(0)}%`

const useTimelineEvents = (route: Route) => {
  const [stats, setStats] = useState<RouteStatistics>()
  useEffect(() => {
    getTimelineEvents(route).then((x) => setStats(generateRouteStatistics(route, x)))
  }, [route])
  return stats
}

export const Stats = ({ className, route }: { className?: string; route: Route }) => {
  const stats = useTimelineEvents(route)

  return (
    <div className={clsx('flex w-full justify-between gap-8 p-5 bg-background-alt rounded-xl', className)}>
      {[
        { label: 'Distance', value: formatDistance(route?.distance) },
        { label: 'Duration', value: stats ? formatDuration(stats.routeDurationMs / (60 * 1000)) : formatRouteDuration(route) },
        { label: 'Engaged', value: formatEngagement(stats) },
      ]?.map((stat) => (
        <div key={stat.label} className="flex basis-0 grow flex-col justify-between">
          <span className="text-sm text-background-alt-x">{stat.label}</span>
          <span className="font-mono text-sm">{stat.value?.toString() ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
