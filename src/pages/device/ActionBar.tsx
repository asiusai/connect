import clsx from 'clsx'
import { IconName } from '../../components/Icon'
import { z } from 'zod'
import React, { useState } from 'react'
import { ParamValue } from '../../api/athena'
import { navigateTo } from './Location'
import { useDeviceParams } from './DeviceParamsContext'
import { useRouteParams } from '../../utils/hooks'
import { IconButton } from '../../components/IconButton'

const BaseAction = z.object({
  icon: IconName,
  title: z.string(),
})

const DummyAction = BaseAction.extend({
  type: z.literal('dummy'),
})

const NavigationAction = BaseAction.extend({
  type: z.literal('navigation'),
  location: z.string(),
})

const ToggleAction = BaseAction.extend({
  type: z.literal('toggle'),
  param: ParamValue,
})

const RedirectAction = BaseAction.extend({
  type: z.literal('redirect'),
  href: z.string(),
})

export const Action = z.discriminatedUnion('type', [DummyAction, NavigationAction, ToggleAction, RedirectAction])
export type Action = z.infer<typeof Action>

const DummyActionComponent = ({ icon, title }: z.infer<typeof DummyAction>) => {
  return (
    <IconButton
      name={icon}
      disabled={true}
      className={clsx(
        'text-xl flex items-center justify-center aspect-square rounded-lg bg-background-alt transition-colors border border-white/5 text-white/80 ',
      )}
      title={title}
    />
  )
}

const RedirectActionComponent = ({ icon, title, href }: z.infer<typeof RedirectAction>) => {
  return (
    <IconButton
      name={icon}
      href={href}
      disabled={!href}
      className={clsx(
        'text-xl flex items-center justify-center aspect-square rounded-lg bg-background-alt transition-colors border border-white/5 text-white/80 ',
      )}
      title={title}
    />
  )
}

const ToggleActionComponent = (_: z.infer<typeof ToggleAction>) => {
  return null
}

const NavigationActionComponent = ({ title, icon, location }: z.infer<typeof NavigationAction>) => {
  const [loading, setLoading] = useState(false)
  const { dongleId } = useRouteParams()
  const { favorites } = useDeviceParams()
  const address = favorites[location]
  return (
    <IconButton
      name={icon}
      onClick={async () => {
        setLoading(true)
        if (address) await navigateTo(address, dongleId)
        setLoading(false)
      }}
      loading={loading}
      disabled={!address || loading}
      className={clsx(
        'flex items-center justify-center aspect-square rounded-lg bg-background-alt transition-colors border border-white/5 text-white/80 text-xl',
      )}
      title={title}
    />
  )
}

export const ActionBar = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const actions: Action[] = [
    { type: 'dummy', icon: 'power_settings_new', title: 'Shutdown' },
    { type: 'navigation', icon: 'home', title: 'Navigate to home', location: 'home' },
    { type: 'navigation', icon: 'work', title: 'Navigate to work', location: 'work' },
    { type: 'redirect', icon: 'camera', title: 'Take snapshot', href: `/${dongleId}/sentry?instant=1` },
  ]
  return (
    <div
      className={clsx('grid gap-2', className)}
      style={{
        gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
      }}
    >
      {actions.map((props, i) => (
        <React.Fragment key={i}>
          {props.type === 'dummy' && <DummyActionComponent {...props} />}
          {props.type === 'redirect' && <RedirectActionComponent {...props} />}
          {props.type === 'toggle' && <ToggleActionComponent {...props} />}
          {props.type === 'navigation' && <NavigationActionComponent {...props} />}
        </React.Fragment>
      ))}
    </div>
  )
}
