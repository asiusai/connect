import clsx from 'clsx'

import { ButtonBase } from '~/components/material/ButtonBase'
import { ReactNode } from 'react'

type ListItemContentProps = {
  headline: ReactNode
  subhead?: ReactNode
}

export const ListItemContent = (props: ListItemContentProps) => {
  return (
    <div className="min-w-0">
      <div className="truncate text-body-lg text-on-surface">{props.headline}</div>
      {props.subhead && <div className="text-body-md text-on-surface-variant">{props.subhead}</div>}
    </div>
  )
}

type ListItemProps = {
  className?: string
  variant?: '1-line' | '2-line' | '3-line' | 'nav'
  selected?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  href?: string
  activeClass?: string
  children?: ReactNode
}

// TODO: guess variant from content
export const ListItem = (props: ListItemProps) => {
  const variantStyle = {
    '1-line': 'h-14',
    '2-line': 'h-20',
    '3-line': 'h-28',
    nav: 'h-14 gap-3 before:rounded-full before:duration-0',
  }[props.variant || '1-line']
  return (
    <ButtonBase
      className={clsx(
        'elevation-0 state-layer flex shrink-0 items-center gap-4 py-2 pl-4 pr-6 transition-colors before:bg-on-surface',
        variantStyle,
        props.selected && 'before:opacity-[.12]',
        props.className,
      )}
      onClick={props.onClick}
      href={props.href}
      activeClass={clsx('before:opacity-[.12]', props.activeClass)}
    >
      {props.leading}
      {props.children}
      {props.trailing && <span className="ml-auto">{props.trailing}</span>}
    </ButtonBase>
  )
}

type ListProps = {
  className?: string
  variant?: 'nav'
  children?: ReactNode
}

export const List = (props: ListProps) => {
  return <div className={clsx('flex flex-col', props.variant === 'nav' ? 'gap-0' : 'gap-2', props.className)}>{props.children}</div>
}
