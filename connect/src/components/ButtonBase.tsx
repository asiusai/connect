import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../../shared/helpers'

export type ButtonBaseProps = {
  className?: string
  disabled?: boolean
  href?: string
  children: ReactNode
  onClick?: (e: any) => void
  activeClass?: string
  download?: string
  target?: string
  title?: string
}

export const ButtonBase = ({ activeClass, href, onClick, ...props }: ButtonBaseProps) => {
  const className = cn('isolate overflow-hidden', props.className, props.disabled && 'opacity-65 pointer-events-none')
  return href ? (
    <Link {...props} to={href} onClick={onClick} className={className} />
  ) : (
    <button
      {...props}
      onClick={(e) => {
        if (!onClick) return
        e.stopPropagation()
        onClick(e)
      }}
      className={className}
    />
  )
}
