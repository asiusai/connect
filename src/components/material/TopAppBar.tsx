import clsx from 'clsx'
import { ReactNode } from 'react'

type TopAppBarProps = {
  className?: string
  component?: 'h1' | 'h2'
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
  removePadding?: boolean
}

export const TopAppBar = (props: TopAppBarProps) => {
  return (
    <div className={clsx('sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5', props.className)}>
      <div className="flex items-center gap-4 px-4 py-3">
        {props.leading}
        <div className="flex-1 truncate text-lg font-bold">{props.children}</div>
        {props.trailing}
      </div>
    </div>
  )
}
