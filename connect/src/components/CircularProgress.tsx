import { cn } from '../../../shared/helpers'

type CircularProgressProps = {
  loading?: number | boolean
  className?: string
}

export const CircularProgress = ({ loading, className }: CircularProgressProps) => {
  const value = typeof loading === 'number' ? loading : undefined
  const isIndeterminate = value === undefined

  return (
    <svg className={cn('h-6 w-6', className, isIndeterminate ? 'animate-spin' : '-rotate-90')} viewBox="0 0 24 24">
      {isIndeterminate ? <circle className="text-current opacity-25" cx={12} cy={12} r={10.5} stroke="currentColor" strokeWidth={3} fill="none" /> : null}
      <circle
        className="text-current transition-[stroke-dashoffset] duration-300 ease-in-out"
        cx={12}
        cy={12}
        r={10.5}
        stroke="currentColor"
        strokeWidth={3}
        fill="none"
        strokeDasharray={isIndeterminate ? '46.18 19.79' : 65.97}
        strokeDashoffset={isIndeterminate ? 0 : 65.97 * (1 - (value || 0))}
        strokeLinecap="round"
      />
    </svg>
  )
}
