import clsx from 'clsx'
import { IconName } from '../../components/Icon'
import { z } from 'zod'
import { useDevice } from './useDevice'
import { useIsDeviceOwner, useRouteParams } from '../../utils/hooks'
import { IconButton } from '../../components/IconButton'
import { DeviceParamType } from '../../utils/params'
import { useStorage } from '../../utils/storage'
import { useEffect, useRef, useState } from 'react'

const BaseAction = z.object({
  icon: IconName,
  title: z.string(),
})

const NavigationAction = BaseAction.extend({
  type: z.literal('navigation'),
  location: z.string(),
})

const ToggleAction = BaseAction.extend({
  type: z.literal('toggle'),
  toggleKey: z.string(),
  toggleType: z.number(),
  disabled: z.boolean().optional(),
})

const RedirectAction = BaseAction.extend({
  type: z.literal('redirect'),
  href: z.string(),
})

export const Action = z.discriminatedUnion('type', [NavigationAction, ToggleAction, RedirectAction])
export type Action = z.infer<typeof Action>

const BUTTON_STYLE = 'h-full w-full rounded-md border border-white/5 text-white bg-background-alt hover:bg-background'
const SELECTED_BUTTON = 'bg-white !text-background-alt hover:!bg-white/80'

const RedirectActionComponent = ({ icon, title, href }: z.infer<typeof RedirectAction>) => {
  const { dongleId } = useRouteParams()
  return (
    <IconButton
      name={icon}
      href={href.replaceAll('{dongleId}', dongleId)}
      disabled={!href.replaceAll('{dongleId}', dongleId)}
      className={clsx(BUTTON_STYLE)}
      title={title}
    />
  )
}

const ToggleActionComponent = ({ icon, toggleKey, toggleType, title, disabled }: z.infer<typeof ToggleAction>) => {
  const { get, isLoading, isError, save } = useDevice()
  if (toggleType !== DeviceParamType.Boolean) return null
  const value = get(toggleKey as any)
  const isSelected = value === '1'
  return (
    <IconButton
      name={icon}
      onClick={async () => {
        await save({ [toggleKey]: isSelected ? '0' : '1' })
      }}
      disabled={isLoading || isError || value === undefined || disabled}
      className={clsx(BUTTON_STYLE, isSelected && SELECTED_BUTTON)}
      title={title}
    />
  )
}

const NavigationActionComponent = ({ title, icon, location }: z.infer<typeof NavigationAction>) => {
  const { setMapboxRoute, route, favorites } = useDevice()
  const address = favorites?.[location]
  const isSelected = route && route === address
  return (
    <IconButton
      name={icon}
      onClick={async () => {
        if (!address) return
        await setMapboxRoute(address)
      }}
      disabled={!address || route === undefined}
      className={clsx(BUTTON_STYLE, isSelected && SELECTED_BUTTON)}
      title={title}
    />
  )
}

export const AddToActionBar = ({ action }: { action: Action }) => {
  const [actions, setActions] = useStorage('actions')
  const isAdded = actions.some(
    (a) =>
      a.type === action.type &&
      ((a.type === 'toggle' && action.type === 'toggle' && a.toggleKey === action.toggleKey) ||
        (a.type === 'navigation' && action.type === 'navigation' && a.location === action.location) ||
        (a.type === 'redirect' && action.type === 'redirect' && a.href === action.href)),
  )

  return (
    <IconButton
      name={isAdded ? 'check' : 'close_small'}
      title={isAdded ? 'Added to action bar' : 'Add to action bar'}
      onClick={() => !isAdded && setActions([...actions, action])}
      className={clsx(
        'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 flex md:hidden md:group-hover:flex border border-white/20 z-20',
        isAdded ? 'bg-green-600 text-white' : 'rotate-45 bg-background-alt',
      )}
    />
  )
}

export const ActionBar = ({ className }: { className?: string }) => {
  const [actions, setActions] = useStorage('actions')
  const [editing, setEditing] = useState(false)
  const isOwner = useIsDeviceOwner()
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startHold = () => {
    holdTimer.current = setTimeout(() => setEditing(true), 500)
  }

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  useEffect(() => {
    if (!editing) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [editing])
  if (!isOwner) return null
  return (
    <div
      ref={containerRef}
      className={clsx('flex gap-2 flex-wrap items-center justify-center', className)}
      style={{
        gridTemplateColumns: `repeat(${actions.length}, minmax(2, 2fr))`,
      }}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
    >
      {actions.map((props, i) => (
        <div key={i} className="flex text-xl relative group min-w-10 h-10 min-h-10 flex-1">
          {props.type === 'redirect' && <RedirectActionComponent {...props} />}
          {props.type === 'toggle' && <ToggleActionComponent {...props} />}
          {props.type === 'navigation' && <NavigationActionComponent {...props} />}
          <IconButton
            name="close_small"
            title="Remove"
            onClick={() => {
              setActions(actions.filter((_, j) => i !== j))
            }}
            className={clsx(
              'absolute translate-x-1/2 -translate-y-1/2 top-0 right-0 border border-white/20 z-10 text-white bg-background aspect-square hover:bg-background-alt',
              editing ? 'flex' : 'hidden md:group-hover:flex',
            )}
          />
        </div>
      ))}
    </div>
  )
}
