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
    <header className={clsx('inset-x-0 top-0 flex items-center gap-4 px-5 py-5 text-background-x', props.className)}>
      {props.leading}
      <h1 className="grow truncate text-2xl">{props.children}</h1>
      {props.trailing}
    </header>
  )
}
