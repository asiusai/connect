import clsx from 'clsx'

export const StatisticBar = ({
  stats,
  className,
}: {
  className?: string
  stats?: { label: string; value: string | number | null | undefined }[]
}) => {
  return (
    <div className="flex flex-col">
      <div className={clsx('flex h-auto w-full justify-between gap-8', className)}>
        {stats?.map((stat) => (
          <div key={stat.label} className="flex basis-0 grow flex-col justify-between">
            <span className="text-xs text-on-surface-variant">{stat.label}</span>
            <span className="font-mono text-sm">{stat.value?.toString() ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
