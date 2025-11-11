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
    text: 'text-primary before:bg-on-primary',
    primary: 'bg-primary before:bg-on-primary text-on-primary hover:elevation-1',
    secondary: 'bg-secondary before:bg-on-secondary text-on-secondary hover:elevation-1',
    tertiary: 'bg-tertiary before:bg-on-tertiary text-on-tertiary hover:elevation-1',
    error: 'bg-error before:bg-on-error text-on-error hover:elevation-1',
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
      <span className={clsx('text-label-lg', loading && 'invisible')}>{children}</span>
      {loading && <Icon name="autorenew" className="absolute left-1/2 top-1/2 ml-[-10px] mt-[-10px] animate-spin" size="20" />}
      {trailing}
    </ButtonBase>
  )
}
