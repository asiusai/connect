import clsx from 'clsx'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type ButtonBaseProps = {
  className?: string
  disabled?: boolean
  href?: string
  children: ReactNode
  onClick?: () => void
  activeClass?: string
  download?: string
  target?: string
}

export const ButtonBase = ({ activeClass, ...props }: ButtonBaseProps) => {
  const className = clsx('isolate overflow-hidden', props.className, props.disabled && 'opacity-70')
  return props.href ? <Link {...props} to={props.href} className={className} /> : <button {...props} className={className} />
}
