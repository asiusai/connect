import clsx from 'clsx'

import { ButtonBase, type ButtonBaseProps } from './ButtonBase'
import { Icon } from './Icon'
import { ReactNode } from 'react'

type ButtonProps = ButtonBaseProps & {
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'text'
  disabled?: boolean
  loading?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}

export const Button = ({ color, leading, trailing, className, children, disabled, loading, ...props }: ButtonProps) => {
  const colorClasses = {
    text: 'text-primary before:bg-primary-x',
    primary: 'bg-primary before:bg-primary-x text-primary-x',
    secondary: 'bg-secondary before:bg-secondary-x text-secondary-x',
    tertiary: 'bg-tertiary before:bg-tertiary-x text-tertiary-x',
    error: 'bg-error before:bg-error-x text-error-x',
  }[color || 'primary']
  if (!disabled && loading) disabled = true

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
      disabled={disabled || loading}
    >
      {leading}
      <span className={clsx('text-sm', loading && 'invisible')}>{children}</span>
      {loading && <Icon name="autorenew" className="absolute left-1/2 top-1/2 ml-[-10px] mt-[-10px] animate-spin" size="20" />}
      {trailing}
    </ButtonBase>
  )
}
