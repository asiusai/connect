import { useState } from 'react'
import { IconButton } from './material/IconButton'

export const Copy = ({ value, className }: { value: string; className?: string }) => {
  const [copied, setCopied] = useState(false)
  return (
    <IconButton
      name={copied ? 'check' : 'file_copy'}
      className={className}
      disabled={copied}
      size="20"
      onClick={async () => {
        setCopied(true)
        await navigator.clipboard.writeText(value)
        setTimeout(() => setCopied(false), 10_000)
      }}
    />
  )
}
