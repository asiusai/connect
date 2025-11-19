import clsx from 'clsx'
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type ButtonBaseProps = {
  className?: string
  disabled?: boolean
  href?: string
  children?: ReactNode
  onClick?: () => void
  activeClass?: string
  download?: string
}

export const ButtonBase = ({ activeClass, download, ...props }: ButtonBaseProps) => {
  const className = clsx('isolate overflow-hidden', props.className, props.disabled && 'opacity-50')
  return props.href ? <Link {...props} to={props.href} className={className} /> : <button {...props} className={className} />
}
