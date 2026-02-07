import { ReactNode } from 'react'
import { cn } from '../../../shared/helpers'
import { ChevronLeftIcon } from 'lucide-react'
import { useRouteParams } from '../hooks'
import { Link } from 'react-router-dom'

export const TopAppBar = ({ children, className, trailing }: { className?: string; trailing?: ReactNode; children?: ReactNode }) => {
  const { dongleId } = useRouteParams()
  return (
    <div className={cn('sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5 md:border-none pt-[env(safe-area-inset-top)]', className)}>
      <div className="flex items-center gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
        <Link to={`/${dongleId}`} className="md:hidden">
          <ChevronLeftIcon className="text-xl" />
        </Link>
        <div className="flex-1 truncate text-lg md:text-2xl font-bold flex flex-col leading-tight">{children}</div>
        {trailing}
      </div>
    </div>
  )
}
