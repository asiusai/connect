import clsx from 'clsx'
import { CSSProperties } from 'react'

export const Loading = ({ className, style }: { className?: string; style?: CSSProperties }) => {
  return <div className={clsx('skeleton-loader', className)} style={style}></div>
}
