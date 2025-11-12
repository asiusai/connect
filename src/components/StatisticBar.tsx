import clsx from 'clsx'
import { Suspense } from 'react'

export const StatisticBar = (props: { className?: string; statistics: { label: string; value: () => unknown }[] }) => {
  return (
    <div className="flex flex-col">
      <div className={clsx('flex h-auto w-full justify-between gap-8', props.className)}>
        {props.statistics.map((statistic) => (
          <div key={statistic.label} className="flex basis-0 grow flex-col justify-between">
            <span className="text-xs text-on-surface-variant">{statistic.label}</span>
            <Suspense fallback={<div className="h-[20px] w-auto skeleton-loader rounded-xs" />}>
              <span className="font-mono text-sm">{statistic.value()?.toString() ?? '—'}</span>
            </Suspense>
          </div>
        ))}
      </div>
    </div>
  )
}
