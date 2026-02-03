import { ReactNode } from 'react'
import { cn } from '../../../shared/helpers'
import { useSidebar } from './Sidebar'
import { MenuIcon } from 'lucide-react'

export const TopAppBar = ({ children, className, trailing }: { className?: string; trailing?: ReactNode; children?: ReactNode }) => {
  const { set } = useSidebar()
  return (
    <div className={cn('sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5 md:border-none', className)}>
      <div className="flex items-center gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
        <MenuIcon onClick={() => set({ open: true })} className="text-xl md:hidden" />
        <div className="flex-1 truncate text-lg md:text-2xl font-bold flex flex-col leading-tight">{children}</div>
        {trailing}
      </div>
    </div>
  )
}
