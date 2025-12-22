import clsx from 'clsx'
import { IconName } from '../../components/Icon'
import { z } from 'zod'
import { useDeviceParams } from './useDeviceParams'
import { useRouteParams } from '../../utils/hooks'
import { IconButton } from '../../components/IconButton'
import { DEVICE_PARAMS, DeviceParamType } from '../toggles/settings'
import { Fragment } from 'react'

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
  toggleKey: z.string(),
  toggleType: z.number(),
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

const ToggleActionComponent = ({ icon, toggleKey, toggleType, title }: z.infer<typeof ToggleAction>) => {
  const { get, isLoading, isError, save } = useDeviceParams()
  if (toggleType !== DeviceParamType.Boolean) return null
  const value = get(toggleKey as any)
  const isSelected = value === '1'
  return (
    <IconButton
      name={icon}
      onClick={async () => {
        await save({ [toggleKey]: isSelected ? '0' : '1' })
      }}
      disabled={isLoading || isError || value === undefined}
      className={clsx(
        'flex items-center justify-center aspect-square rounded-lg  transition-colors border border-white/5  text-xl',
        isSelected ? 'bg-white text-background-alt' : 'bg-background-alt text-white/80',
      )}
      title={title}
    />
  )
}

const NavigationActionComponent = ({ title, icon, location }: z.infer<typeof NavigationAction>) => {
  const { getMapboxFavorites, setMapboxRoute, getMapboxRoute } = useDeviceParams()
  const address = getMapboxFavorites()?.[location]
  const route = getMapboxRoute()
  const isSelected = route && route === address
  return (
    <IconButton
      name={icon}
      onClick={async () => {
        if (!address) return
        await setMapboxRoute(address)
      }}
      disabled={!address || route === undefined}
      className={clsx(
        'flex items-center justify-center aspect-square rounded-lg transition-colors border border-white/5 text-xl',
        isSelected ? 'bg-white text-background-alt' : 'bg-background-alt text-white/80',
      )}
      title={title}
    />
  )
}

export const ActionBar = ({ className }: { className?: string }) => {
  const { dongleId } = useRouteParams()
  const actions: Action[] = [
    { type: 'toggle', icon: 'power_settings_new', title: DEVICE_PARAMS.DoShutdown.label, toggleKey: 'DoShutdown', toggleType: DeviceParamType.Boolean },
    // { type: 'toggle', icon: 'joystick', title: DEVICE_PARAMS.JoystickDebugMode.label, toggleKey: 'JoystickDebugMode', toggleType: DeviceParamType.Boolean },
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
        <Fragment key={i}>
          {props.type === 'dummy' && <DummyActionComponent {...props} />}
          {props.type === 'redirect' && <RedirectActionComponent {...props} />}
          {props.type === 'toggle' && <ToggleActionComponent {...props} />}
          {props.type === 'navigation' && <NavigationActionComponent {...props} />}
        </Fragment>
      ))}
    </div>
  )
}
