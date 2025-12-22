import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loading } from '../../components/Loading'
import { useDevice } from '../../api/queries'
import { Location, navigateTo } from './Location'
import { Routes } from './Routes'
import { Stats } from './Stats'
import { Info } from './Info'
import { ActionBar } from './ActionBar'
import { Navigation } from './Navigation'
import { useRouteParams, useScroll } from '../../utils/hooks'
import { DevicesMobile } from './DevicesMobile'
import { Icon } from '../../components/Icon'
import { useStorage } from '../../utils/storage'
import { useDeviceParams } from './DeviceParamsContext'
import clsx from 'clsx'
import { toast } from 'sonner'

const NavButton = ({ searchOpen, setSearchOpen }: { searchOpen: boolean; setSearchOpen: (open: boolean) => void }) => {
  const { dongleId, currentRoute, setCurrentRoute } = useDeviceParams()
  const [isClearing, setIsClearing] = useState(false)

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsClearing(true)
    setCurrentRoute(null)
    try {
      await navigateTo(null, dongleId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear route')
    } finally {
      setIsClearing(false)
    }
  }

  if (searchOpen) return null

  if (currentRoute) {
    return (
      <div
        onClick={() => setSearchOpen(true)}
        className={clsx(
          'flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full pl-3 pr-1 py-1 cursor-pointer',
          'hover:bg-background/90 transition-colors max-w-[50vw] md:max-w-64',
        )}
      >
        <Icon name="navigation" className="text-primary text-lg shrink-0" />
        <span className="text-sm truncate">{currentRoute}</span>
        <button
          onClick={handleClear}
          disabled={isClearing}
          className="size-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 shrink-0"
          title="Clear route"
        >
          <Icon name="close" className="text-base" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setSearchOpen(true)}
      className="flex items-center justify-center size-12 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background/90 transition-colors"
      title="Navigate"
    >
      <Icon name="search" className="text-xl" />
    </button>
  )
}

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [device, { isLoading, error }] = useDevice(dongleId)
  const [usingCorrectFork] = useStorage('usingCorrectFork')
  const [searchOpen, setSearchOpen] = useState(false)

  const scroll = useScroll()

  if (isLoading) return <Loading className="h-screen w-screen" />

  if (!device || error) {
    return (
      <div className="flex flex-1 w-full flex-col items-center justify-center gap-6 bg-background text-background-x p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Icon name="error" className="text-error text-5xl" />
          <h1 className="text-2xl font-bold text-primary">Device not found</h1>
          <p className="text-secondary-alt-x">The device you are looking for does not exist or you don't have permission to view it.</p>
          <p className="text-secondary-alt-x">Select another device from the dropdown list.</p>
        </div>
      </div>
    )
  }

  const height = 400
  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="w-full sticky top-0" style={{ height }}>
        <Location device={device} className="h-full w-full" searchOpen={searchOpen} onSearchOpenChange={setSearchOpen} />
        <div className="absolute z-[999] top-0 w-full p-4 md:hidden">
          <div className="flex justify-between items-start gap-2 w-full">
            <DevicesMobile />
            {usingCorrectFork && <NavButton searchOpen={searchOpen} setSearchOpen={setSearchOpen} />}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-background z-[999]" style={{ opacity: scroll / height }} />
      </div>
      {usingCorrectFork &&
        createPortal(
          <div className="fixed top-3 right-3 z-[9999] hidden md:block">
            <NavButton searchOpen={searchOpen} setSearchOpen={setSearchOpen} />
          </div>,
          document.body,
        )}

      <div className="grid md:grid-cols-3 gap-10 p-6 bg-background relative">
        <div className="md:hidden absolute top-0 -translate-y-[100%] py-2 flex w-full">
          <ActionBar className="mx-auto w-64 gap-4" />
        </div>
        <Navigation className="md:hidden" />
        <Routes className="md:col-span-2 row-span-3" />
        <Stats className="" />
        <Info className="" />
      </div>
    </div>
  )
}
