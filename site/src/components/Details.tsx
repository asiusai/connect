import { useState, type ReactNode } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { cn } from '../../../shared/helpers'

export const Details = ({ title, children }: { title: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-background-alt">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 py-3 text-left hover:text-primary transition-colors">
        <ChevronRightIcon className={cn('duration-150', open ? 'rotate-90' : '')} />
        <span className="font-medium">{title}</span>
      </button>
      <div className={cn('pb-2 pl-4 text-background-x/80', !open && 'hidden')}>{children}</div>
    </div>
  )
}
