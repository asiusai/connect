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
  text: 'text-primary before:bg-primary-x',
  primary: 'bg-primary before:bg-primary-x text-primary-x',
  secondary: 'bg-secondary before:bg-secondary-x text-secondary-x',
  tertiary: 'bg-tertiary before:bg-tertiary-x text-tertiary-x',
  error: 'bg-error before:bg-error-x text-error-x',
}

export const Button = ({ color, leading, trailing, className, children, disabled, loading, ...props }: ButtonProps) => {
  const colorClasses = BUTTON_CLASSES[color || 'primary']
  const isLoading = !!loading || loading === 0
  if (!disabled && isLoading) disabled = true

  return (
    <ButtonBase
      className={clsx(
        'state-layer inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full py-1 contrast-100 transition',
        colorClasses,
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && 'hover:opacity-80',
        leading ? 'pl-4' : 'pl-6',
        trailing ? 'pr-4' : 'pr-6',
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
            <CircularProgress loading={loading} size="20" />
          </span>
        )}
      </span>
      {trailing}
    </ButtonBase>
  )
}
