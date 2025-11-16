import clsx from 'clsx'
import { ReactNode } from 'react'

import { ButtonBase } from './ButtonBase'

type CardHeaderProps = {
  className?: string
  headline?: ReactNode
  subhead?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
}

export const CardHeader = (props: CardHeaderProps) => {
  return (
    <div className={clsx('flex min-h-[72px] items-center gap-4 px-4 py-3', props.className)}>
      {props.leading}
      <div className="flex min-h-12 grow flex-col justify-between">
        {props.headline && <span className="text-title-md">{props.headline}</span>}
        {props.subhead && <span className="text-body-md">{props.subhead}</span>}
      </div>
      {props.trailing}
    </div>
  )
}

type CardContentProps = {
  className?: string
  children?: ReactNode
}

export const CardContent = (props: CardContentProps) => {
  return <div className={clsx('flex flex-col gap-4 p-4', props.className)}>{props.children}</div>
}

type CardTextContentProps = {
  className?: string
  children?: ReactNode
}

export const CardTextContent = (props: CardTextContentProps) => {
  return (
    <div className={clsx('flex', props.className)}>
      <span className="text-body-md text-on-surface-variant">{props.children}</span>
    </div>
  )
}

type CardActionsProps = {
  className?: string
  children?: ReactNode
}

export const CardActions = (props: CardActionsProps) => {
  return <div className={clsx('flex justify-end gap-4', props.className)}>{props.children}</div>
}

type CardProps = {
  className?: string
  onClick?: () => void
  href?: string
  activeClass?: string
  children?: ReactNode
}

export const Card = (props: CardProps) => {
  const cardStyle = 'flex max-w-md flex-col rounded-lg bg-surface-container text-on-surface before:bg-on-surface'
  return (
    <>
      {props.onClick || props.href ? (
        <ButtonBase
          className={clsx(cardStyle, (props.href || props.onClick) && 'state-layer', props.className)}
          onClick={props.onClick}
          href={props.href}
          activeClass={clsx('before:opacity-[.12]', props.activeClass)}
        >
          {props.children}
        </ButtonBase>
      ) : (
        <div className={clsx(cardStyle, props.className)}>{props.children}</div>
      )}
    </>
  )
}
