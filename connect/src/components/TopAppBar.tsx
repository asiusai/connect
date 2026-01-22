import { ReactNode } from 'react'
import { cn } from '../../../shared/helpers'

export const TopAppBar = ({
  children,
  className,
  leading,
  trailing,
}: {
  className?: string
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
}) => {
  return (
    <div className={cn('sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5 md:border-none', className)}>
      <div className="flex items-center gap-4 px-4 py-3 md:gap-4 md:px-8 md:py-6">
        {leading}
        <div className="flex-1 truncate text-lg md:text-2xl font-bold flex flex-col leading-tight">{children}</div>
        {trailing}
      </div>
    </div>
  )
}
