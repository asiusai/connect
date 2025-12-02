import clsx from 'clsx'

type CircularProgressProps = {
  size?: number | string
  loading?: number | boolean
  className?: string
}

export const CircularProgress = ({ size = 24, loading, className }: CircularProgressProps) => {
  const value = typeof loading === 'number' ? loading : undefined

  const sizeNum = typeof size === 'string' ? parseInt(size, 10) : size
  const strokeWidth = 3
  const radius = (sizeNum - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const isIndeterminate = value === undefined

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} style={{ width: sizeNum, height: sizeNum }}>
      <svg
        className={clsx('absolute inset-0', {
          'animate-spin': isIndeterminate,
          '-rotate-90': !isIndeterminate,
        })}
        width={size}
        height={size}
        viewBox={`0 0 ${sizeNum} ${sizeNum}`}
      >
        {isIndeterminate ? (
          <circle
            className="text-current opacity-25"
            cx={sizeNum / 2}
            cy={sizeNum / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
          />
        ) : null}
        <circle
          className={clsx('text-current transition-[stroke-dashoffset] duration-300 ease-in-out', {
            'opacity-25': !isIndeterminate && value === 0, // Optional: hide track if 0? No, let's keep it simple or maybe just show the progress.
            // Actually for indeterminate, we usually have a specific animation.
            // Let's stick to a simple spinner for indeterminate using a dasharray gap.
          })}
          cx={sizeNum / 2}
          cy={sizeNum / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={isIndeterminate ? `${circumference * 0.7} ${circumference * 0.3}` : circumference}
          strokeDashoffset={isIndeterminate ? 0 : circumference * (1 - (value || 0))}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
