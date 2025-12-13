import clsx from 'clsx'
import { formatDistance, formatDuration, formatRouteDuration } from '../../utils/format'
import { Route } from '../../types'
import { useAsyncMemo } from '../../utils/hooks'
import { getRouteStats } from '../../utils/derived'

export const Stats = ({ className, route }: { className?: string; route: Route }) => {
  const stats = useAsyncMemo(() => getRouteStats(route), [route])

  return (
    <div className={clsx('flex w-full justify-between gap-8 p-5 bg-background-alt rounded-xl', className)}>
      {[
        { label: 'Distance', value: route.distance ? formatDistance(route?.distance) : undefined },
        { label: 'Duration', value: stats ? formatDuration(stats.routeDurationMs / (60 * 1000)) : formatRouteDuration(route) },
        {
          label: 'Engaged',
          value: stats?.routeDurationMs ? `${(100 * (stats.engagedDurationMs / stats.routeDurationMs)).toFixed(0)}%` : undefined,
        },
      ]?.map((stat) => (
        <div key={stat.label} className="flex basis-0 grow flex-col justify-between">
          <span className="text-sm text-background-alt-x">{stat.label}</span>
          <span className="font-mono text-sm">{stat.value?.toString() ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
