import { z } from 'zod'
// import { useDevice } from '../../hooks/useDevice'
// import { useRouteParams } from '../../hooks'
// import { IconButton } from '../../components/IconButton'
// import { ParamType } from '../../utils/params'
// import { useStorage } from '../../utils/storage'
// import { useEffect, useRef, useState } from 'react'
// import { cn } from '../../../../shared/helpers'
// import { CheckIcon, MapPinIcon, XIcon } from 'lucide-react'
// import { ICON_MAP } from '../../utils/iconMap'
// import { useIsDeviceOwner } from '../../hooks/useIsDeviceOwner'

const BaseAction = z.object({
  icon: z.string(),
  title: z.string(),
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

export const Action = z.discriminatedUnion('type', [ToggleAction, RedirectAction])
export type Action = z.infer<typeof Action>

// const BUTTON_STYLE = 'h-full w-full rounded-md border border-white/5 text-white bg-background-alt hover:bg-background'
// const SELECTED_BUTTON = 'bg-white !text-background-alt hover:!bg-white/80'

// const RedirectActionComponent = ({ icon, title, href }: z.infer<typeof RedirectAction>) => {
//   const { dongleId } = useRouteParams()
//   return (
//     <IconButton
//       icon={ICON_MAP[icon] ?? MapPinIcon}
//       href={href.replaceAll('{dongleId}', dongleId)}
//       disabled={!href.replaceAll('{dongleId}', dongleId)}
//       className={cn(BUTTON_STYLE)}
//       title={title}
//     />
//   )
// }

// const ToggleActionComponent = ({ icon, toggleKey, toggleType, title, disabled }: z.infer<typeof ToggleAction>) => {
//   const { get, isLoading, isError, save } = useDevice()
//   if (toggleType !== ParamType.BOOL) return null
//   const value = get(toggleKey as any)
//   const isSelected = value === '1'
//   return (
//     <IconButton
//       icon={ICON_MAP[icon] ?? MapPinIcon}
//       onClick={async () => {
//         await save({ [toggleKey]: isSelected ? '0' : '1' })
//       }}
//       disabled={isLoading || isError || value === undefined || disabled}
//       className={cn(BUTTON_STYLE, isSelected && SELECTED_BUTTON)}
//       title={title}
//     />
//   )
// }

export const AddToActionBar = (_: { action: Action }) => {
  return null
  // const { actions, set } = useStorage()
  // const isAdded = actions.some(
  //   (a) =>
  //     a.type === action.type &&
  //     ((a.type === 'toggle' && action.type === 'toggle' && a.toggleKey === action.toggleKey) ||
  //       (a.type === 'redirect' && action.type === 'redirect' && a.href === action.href)),
  // )

  // return (
  //   <IconButton
  //     icon={isAdded ? CheckIcon : XIcon}
  //     title={isAdded ? 'Added to action bar' : 'Add to action bar'}
  //     onClick={() => !isAdded && set({ actions: [...actions, action] })}
  //     className={cn(
  //       'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 flex md:hidden md:group-hover:flex border border-white/20 z-20',
  //       isAdded ? 'bg-green-600 text-white' : 'rotate-45 bg-background-alt',
  //     )}
  //   />
  // )
}

export const ActionBar = (_: { className?: string }) => {
  return null
  // const { actions, set } = useStorage()
  // const [editing, setEditing] = useState(false)
  // const isOwner = useIsDeviceOwner()
  // const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // const containerRef = useRef<HTMLDivElement>(null)
  // const startHold = () => {
  //   holdTimer.current = setTimeout(() => setEditing(true), 500)
  // }

  // const cancelHold = () => {
  //   if (holdTimer.current) {
  //     clearTimeout(holdTimer.current)
  //     holdTimer.current = null
  //   }
  // }

  // useEffect(() => {
  //   if (!editing) return
  //   const handleClickOutside = (e: MouseEvent | TouchEvent) => {
  //     if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
  //       setEditing(false)
  //     }
  //   }
  //   document.addEventListener('mousedown', handleClickOutside)
  //   document.addEventListener('touchstart', handleClickOutside)
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside)
  //     document.removeEventListener('touchstart', handleClickOutside)
  //   }
  // }, [editing])
  // if (!isOwner) return null
  // return (
  //   <div
  //     ref={containerRef}
  //     className={cn('flex gap-2 flex-wrap items-center justify-center cursor-pointer', className)}
  //     style={{
  //       gridTemplateColumns: `repeat(${actions.length}, minmax(2, 2fr))`,
  //     }}
  //     onTouchStart={startHold}
  //     onTouchEnd={cancelHold}
  //     onTouchCancel={cancelHold}
  //     onMouseDown={startHold}
  //     onMouseUp={cancelHold}
  //     onMouseLeave={cancelHold}
  //   >
  //     {actions.map((props, i) => (
  //       <div key={i} className="flex text-xl relative group min-w-10 h-10 min-h-10 flex-1">
  //         {props.type === 'redirect' && <RedirectActionComponent {...props} />}
  //         {props.type === 'toggle' && <ToggleActionComponent {...props} />}
  //         <IconButton
  //           icon={XIcon}
  //           title="Remove"
  //           onClick={() => set({ actions: actions.filter((_, j) => i !== j) })}
  //           className={cn(
  //             'absolute translate-x-1/2 -translate-y-1/2 top-0 right-0 border border-white/20 z-10 text-white bg-background aspect-square hover:bg-background-alt cursor-pointer',
  //             editing ? 'flex' : 'hidden! md:group-hover:flex!',
  //           )}
  //         />
  //       </div>
  //     ))}
  //   </div>
  // )
}
