import { createContext, ReactNode, useContext } from 'react'

import { IconButton } from '~/components/material/IconButton'
import { Accessor, createSignal, Setter } from '~/fix'
import { useDimensions } from '~/utils/window'

type DrawerContext = {
  modal: Accessor<boolean>
  open: Accessor<boolean>
  setOpen: Setter<boolean>
}

const DrawerContext = createContext<DrawerContext | null>(null)

export function useDrawerContext() {
  const context = useContext(DrawerContext)
  if (!context) throw new Error("can't find DrawerContext")
  return context
}

export const DrawerToggleButton = () => {
  const { modal, setOpen } = useDrawerContext()
  return <>{modal() && <IconButton name="menu" onClick={() => setOpen((prev) => !prev)} />}</>
}

const PEEK = 56

interface DrawerProps {
  drawer: ReactNode
  children?: ReactNode
}

export const Drawer = (props: DrawerProps) => {
  const dimensions = useDimensions()
  const drawerWidth = () => Math.min(dimensions().width - PEEK, 320)
  const modal = () => dimensions().width < 1280
  const contentWidth = () => `calc(100% - ${modal() ? 0 : drawerWidth()}px)`

  const [open, setOpen] = createSignal(false)
  const drawerVisible = () => !modal() || open()

  return (
    <DrawerContext.Provider value={{ modal, open, setOpen }}>
      <nav
        className="hide-scrollbar fixed inset-y-0 left-0 h-full touch-pan-y overflow-y-auto overscroll-y-contain transition-drawer ease-in-out duration-300"
        style={{
          left: drawerVisible() ? 0 : `${-PEEK}px`,
          opacity: drawerVisible() ? 1 : 0.5,
          width: `${drawerWidth()}px`,
        }}
      >
        <div className="flex size-full flex-col rounded-r-lg bg-surface-container-low text-on-surface-variant sm:rounded-r-none">
          {props.drawer}
        </div>
      </nav>

      <main
        className="absolute inset-y-0 overflow-y-auto bg-background transition-drawer ease-in-out duration-300"
        style={{
          left: drawerVisible() ? `${drawerWidth()}px` : 0,
          width: contentWidth(),
        }}
      >
        {props.children}
        <div
          className="absolute inset-0 z-[9999] bg-background transition-drawer ease-in-out duration-300"
          style={{
            pointerEvents: modal() && open() ? 'auto' : 'none',
            opacity: modal() && open() ? 0.5 : 0,
          }}
          onClick={() => setOpen(false)}
        />
      </main>
    </DrawerContext.Provider>
  )
}
