import clsx from 'clsx'
import { formatDistance, formatDuration, formatRouteDuration, getRouteDurationMs } from '../../utils/format'
import { Route } from '../../../../shared/types'
import { useAsyncMemo } from '../../utils/hooks'
import { getRouteStats, getTimelineEvents } from '../../utils/derived'

export const Stats = ({ className, route }: { className?: string; route: Route }) => {
  const stats = useAsyncMemo(() => getTimelineEvents(route).then(getRouteStats), [route])
  const durationMs = getRouteDurationMs(route) ?? 0

  const [distVal, distUnit] = (route.distance ? formatDistance(route.distance) : '0 mi')?.split(' ') ?? ['—', '']

  const durationStr = stats ? formatDuration(durationMs / 60000) : formatRouteDuration(route)
  const durationVal = durationStr?.replace(/[a-z]/g, '').trim() ?? '—'
  const durationUnit = durationStr?.replace(/[0-9.]/g, '').trim() ?? ''

  const engagementPercent = stats && durationMs ? (100 * stats.engagedDurationMs) / durationMs : undefined

  return (
    <div className={clsx('grid w-full grid-cols-3 items-center divide-x divide-white/10 rounded-xl bg-background-alt py-4', className)}>
      <div className="flex flex-col items-center px-4">
        <span className="text-2xl font-bold text-white leading-none">{distVal}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{distUnit}</span>
      </div>

      <div className="flex flex-col items-center px-4">
        <span className="text-2xl font-bold text-white leading-none">{durationVal}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{durationUnit}</span>
      </div>

      <div className="flex flex-col items-center px-4">
        <span className="text-2xl font-bold text-[#32CD32] leading-none">{engagementPercent !== undefined ? `${engagementPercent.toFixed(0)}%` : '—'}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Engaged</span>
      </div>
    </div>
  )
}
