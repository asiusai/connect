import { ReactNode, useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '../../../shared/helpers'

export const Select = <T extends string>({
  value,
  onChange,
  options,
  className,
  disabled,
}: {
  disabled?: boolean
  options: { value: T; label: ReactNode; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  className?: string
  style?: React.CSSProperties
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 bg-background text-sm font-medium pl-3 pr-2 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer hover:border-white/20',
          disabled && 'opacity-40 pointer-events-none',
        )}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDownIcon className={cn('text-sm! text-white/40 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-full bg-background border border-white/10 rounded-lg shadow-xl max-h-64 overflow-y-auto overflow-x-clip">
          {options.map((opt) => (
            <button
              key={opt.value}
              disabled={opt.disabled}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                opt.value === value ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5',
                opt.disabled && 'opacity-30 pointer-events-none',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
