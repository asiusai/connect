import { useState } from 'react'
import { Icon } from './Icon'
import { cn } from '../../../shared/helpers'

export const DetailRow = ({
  label,
  value,
  mono,
  copyable,
  href,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  copyable?: boolean
  href?: string
}) => {
  const [copied, setCopied] = useState(false)

  if (!value) return null

  const handleCopy = (e: React.MouseEvent) => {
    if (!copyable || typeof value !== 'string') return
    e.preventDefault()
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="block">
      <div
        className={cn(
          'flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-4',
          (copyable || href) && 'cursor-pointer hover:bg-white/5 -mx-2 px-2 transition-colors rounded-lg',
        )}
        onClick={copyable ? handleCopy : undefined}
      >
        <span className="text-sm text-white/60 shrink-0">{label}</span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className={cn('font-medium text-white truncate', mono ? 'font-mono text-xs' : 'text-sm')}>{value}</span>
          {copyable && <Icon name={copied ? 'check' : 'file_copy'} className={cn('text-[14px] shrink-0', copied ? 'text-green-400' : 'text-white/20')} />}
          {href && <Icon name="open_in_new" className="text-[14px] text-white/20 shrink-0" />}
        </div>
      </div>
    </a>
  )
}
