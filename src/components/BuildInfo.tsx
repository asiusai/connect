import clsx from 'clsx'

import { dayjs } from '../utils/format'

const sha = import.meta.env.VITE_APP_GIT_SHA || 'develop'
const timestamp = import.meta.env.VITE_APP_GIT_TIMESTAMP
const formattedTimestamp = timestamp ? dayjs(timestamp).format('YYYY-MM-DD HH:mm') : 'local'
console.debug('BuildInfo', { sha, timestamp, formattedTimestamp })

export const BuildInfo = (props: { className?: string }) => {
  return (
    <div className={clsx('text-xs text-on-surface opacity-25 select-text', props.className)}>
      <span className="font-mono cursor-text select-all selection:bg-primary-container">{sha.substring(0, 7)}</span>
      <span className="mx-1">•</span>
      <span>{formattedTimestamp}</span>
    </div>
  )
}
