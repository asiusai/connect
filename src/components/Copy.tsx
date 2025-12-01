import { useState } from 'react'
import { IconButton } from './material/IconButton'
import clsx from 'clsx'

export const Copy = ({ value, className }: { value: string; className?: string }) => {
  const [copied, setCopied] = useState(false)
  return (
    <IconButton
      title={copied ? 'copied' : 'copy'}
      name={copied ? 'check' : 'file_copy'}
      className={clsx('text-xl', className)}
      disabled={copied}
      onClick={async () => {
        setCopied(true)
        await navigator.clipboard.writeText(value)
        setTimeout(() => setCopied(false), 10_000)
      }}
    />
  )
}
