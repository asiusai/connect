import clsx from 'clsx'

import { ButtonBase, type ButtonBaseProps } from './ButtonBase'
import { ReactNode } from 'react'
import { CircularProgress } from './CircularProgress'

type ButtonProps = ButtonBaseProps & {
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'text'
  disabled?: boolean
  loading?: number | boolean
  leading?: ReactNode
  trailing?: ReactNode
}

const BUTTON_CLASSES = {
  text: 'text-white hover:bg-white/10',
  primary: 'bg-white text-black hover:bg-white/90',
  secondary: 'bg-white/10 text-white hover:bg-white/20',
  tertiary: 'bg-transparent text-white border border-white/20 hover:bg-white/10',
  error: 'bg-red-500 text-white hover:bg-red-600',
}

export const Button = ({ color, leading, trailing, className, children, disabled, loading, ...props }: ButtonProps) => {
  const colorClasses = BUTTON_CLASSES[color || 'primary']
  const isLoading = !!loading || loading === 0
  if (!disabled && isLoading) disabled = true

  return (
    <ButtonBase
      className={clsx(
        'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-6 py-2 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        colorClasses,
        className,
      )}
      {...props}
      disabled={disabled}
    >
      {leading}
      <span className={clsx('relative')}>
        <span className={clsx('text-sm', isLoading && 'invisible')}>{children}</span>
        {isLoading && (
          <span className="absolute inset-0 flex justify-center items-center">
            <CircularProgress loading={loading} className="h-5 w-5" />
          </span>
        )}
      </span>
      {trailing}
    </ButtonBase>
  )
}
