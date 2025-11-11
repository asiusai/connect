import clsx from 'clsx'

type LinearProgressProps = {
  className?: string
  progress?: number
  color?: 'primary' | 'secondary' | 'tertiary' | 'error'
}

const colorClasses = {
  primary: { container: 'before:bg-primary', bar: 'bg-primary' },
  secondary: { container: 'before:bg-secondary', bar: 'bg-secondary' },
  tertiary: { container: 'before:bg-tertiary', bar: 'bg-tertiary' },
  error: { container: 'before:bg-error', bar: 'bg-error' },
}

export const LinearProgress = (props: LinearProgressProps) => {
  const color = colorClasses[props.color || 'primary']
  const state = props.progress === undefined ? { indeterminate: true } : { indeterminate: false, progress: props.progress }
  return (
    <div
      className={clsx(
        'relative z-0 block h-1 overflow-hidden rounded-none bg-transparent before:absolute before:inset-0 before:opacity-30',
        color.container,
        props.className,
      )}
    >
      {state.indeterminate ? (
        <>
          <div
            className={clsx('absolute inset-y-0 left-0 h-1 w-auto origin-left transition-indeterminate animate-indeterminate1', color.bar)}
          />
          <div
            className={clsx('absolute inset-y-0 left-0 h-1 w-auto origin-left transition-indeterminate animate-indeterminate2', color.bar)}
          />
        </>
      ) : (
        <div
          className={clsx('absolute inset-y-0 left-0 h-1 transition-[background-color,width] duration-200 ease-linear', color.bar)}
          style={{ width: `${props.progress! * 100}%` }}
        />
      )}
    </div>
  )
}
