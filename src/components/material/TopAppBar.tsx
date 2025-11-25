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
  // TODO: handle component
  return (
    <>
      <header
        className={clsx(
          'fixed flex items-center top-0 left-0 w-screen gap-4 h-16 px-4 text-background-x z-10 bg-background shadow-md shadow-black border-b border-black',
          props.className,
        )}
      >
        {props.leading}
        <h1 className="grow truncate text-2xl">{props.children}</h1>
        {props.trailing}
      </header>
      {!props.removePadding && <div className="h-20 shrink-0"></div>}
    </>
  )
}
