import { CSSProperties } from 'react'
import { cn } from '../../../shared/helpers'

export const Loading = ({ className, style }: { className?: string; style?: CSSProperties }) => {
  return <div className={cn('skeleton-loader', className)} style={style}></div>
}
