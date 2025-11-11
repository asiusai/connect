import clsx from 'clsx'
import { ReactNode } from 'react'

type TopAppBarProps = {
  className?: string
  component?: 'h1' | 'h2'
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
}

export const TopAppBar = (props: TopAppBarProps) => {
  // TODO: handle component
  return (
    <header className={clsx('inset-x-0 top-0 flex h-16 items-center gap-4 px-4 py-5 text-on-surface', props.className)}>
      {props.leading}
      <h1 className="grow truncate text-title-lg">{props.children}</h1>
      {props.trailing}
    </header>
  )
}
