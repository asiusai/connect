import clsx from 'clsx'
import { ButtonBase } from '../../components/ButtonBase'
import { Icon, IconName } from '../../components/Icon'
import { z } from 'zod'
import React from 'react'
import { ParamValue } from '../../api/athena'
import { navigateTo } from './Location'
import { useDeviceParams } from './DeviceParamsContext'
import { useRouteParams } from '../../utils/hooks'

const BaseAction = z.object({
  icon: IconName,
  title: z.string(),
})

const DummyAction = BaseAction.extend({
  type: z.literal('dummy'),
})

const NavigationAction = BaseAction.extend({
  type: z.literal('navigation'),
  location: z.enum(['home', 'work']),
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
    <ButtonBase
      disabled={true}
      className={clsx('flex items-center justify-center aspect-square rounded-lg bg-background-alt transition-colors border border-white/5 text-white/80 ')}
      title={title}
    >
      <Icon name={icon} className="text-xl" />
    </ButtonBase>
  )
}

const RedirectActionComponent = ({ icon, title, href }: z.infer<typeof RedirectAction>) => {
  return (
    <ButtonBase
      href={href}
      disabled={!href}
      className={clsx(
        'flex items-center justify-center aspect-square rounded-lg bg-background-alt transition-colors border border-white/5 text-white/80 ',
        href && 'hover:bg-white/10 hover:text-white',
      )}
      title={title}
    >
      <Icon name={icon} className="text-xl" />
    </ButtonBase>
  )
}

const ToggleActionComponent = (_: z.infer<typeof ToggleAction>) => {
  return null
}

const NavigationActionComponent = ({
  title,
  icon,
  location,
  dongleId,
  favorites,
}: z.infer<typeof NavigationAction> & { dongleId: string; favorites: Record<string, string> }) => {
  const address = favorites[location]
  return (
    <ButtonBase
      onClick={async () => {
        if (address) await navigateTo(address, dongleId)
      }}
      disabled={!address}
      className={clsx(
        'flex items-center justify-center aspect-square rounded-lg bg-background-alt transition-colors border border-white/5 text-white/80 ',
        'hover:bg-white/10 hover:text-white',
      )}
      title={title}
    >
      <Icon name={icon} className="text-xl" />
    </ButtonBase>
  )
}

export const ActionBar = ({ className }: { className?: string }) => {
  const routeParams = useRouteParams()
  const { favorites } = useDeviceParams()
  const dongleId = routeParams.dongleId
  const actions: Action[] = [
    { type: 'dummy', icon: 'power_settings_new', title: 'Shutdown' },
    { type: 'navigation', icon: 'home', title: 'Home', location: 'home' },
    { type: 'navigation', icon: 'work', title: 'Work', location: 'work' },
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
          {props.type === 'navigation' && <NavigationActionComponent {...props} dongleId={dongleId} favorites={favorites} />}
        </React.Fragment>
      ))}
    </div>
  )
}
