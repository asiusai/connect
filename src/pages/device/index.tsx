import { useEffect } from 'react'
import { Loading } from '../../components/Loading'
import { useDevice } from '../../api/queries'
import { Location, useSearch } from './Location'
import { Routes } from './Routes'
import { Stats } from './Stats'
import { Info } from './Info'
import { ActionBar } from './ActionBar'
import { Navigation } from './Navigation'
import { useRouteParams, useScroll } from '../../utils/hooks'
import { DevicesMobile } from './DevicesMobile'
import { Icon } from '../../components/Icon'
import { useStorage } from '../../utils/storage'
import { useDeviceParams } from './useDeviceParams'
import clsx from 'clsx'
import { toast } from 'sonner'
import { IconButton } from '../../components/IconButton'

const NavButton = () => {
  const { setIsSearchOpen } = useSearch()
  const { setMapboxRoute, route, isSaving } = useDeviceParams()

  if (route) {
    return (
      <div
        onClick={() => setIsSearchOpen(true)}
        className={clsx(
          'flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full pl-3 pr-1 py-1 cursor-pointer',
          'hover:bg-background/90 transition-colors max-w-[50vw] md:max-w-64',
        )}
      >
        <Icon name="navigation" className="text-primary text-lg shrink-0" />
        <span className="text-sm truncate">{route}</span>
        <IconButton
          name="close"
          onClick={async (e) => {
            e.stopPropagation()
            const res = await setMapboxRoute(null)
            if (res?.error) toast.error(res.error.data?.message ?? res.error.message)
          }}
          disabled={isSaving}
          className="size-8 flex text-base items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 shrink-0"
          title="Clear route"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsSearchOpen(true)}
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
  const load = useDeviceParams((s) => s.load)

  useEffect(() => {
    if (usingCorrectFork && dongleId) load(dongleId)
  }, [dongleId, usingCorrectFork, load])

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
    <div className="flex flex-col min-h-screen relative bg-background">
      <div className="w-full sticky top-0" style={{ height }}>
        <Location device={device} className="h-full w-full" />
        {usingCorrectFork && (
          <div className="fixed top-3 right-3 z-[9999] hidden md:block">
            <NavButton />
          </div>
        )}
        <div className="absolute z-[999] top-0 w-full p-4 md:hidden">
          <div className="flex justify-between items-start gap-2 w-full">
            <DevicesMobile />
            {usingCorrectFork && <NavButton />}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-background z-[999]" style={{ opacity: scroll / height }} />
      </div>
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid md:grid-cols-12 gap-4 md:gap-6 relative">
          {/* Mobile Action Bar */}
          <div className="md:hidden absolute top-0 -translate-y-[calc(100%+1rem)] flex w-full">
            <ActionBar className="mx-auto w-64 gap-4" />
          </div>

          {/* Navigation - Left sidebar on desktop, top on mobile */}
          <div className="md:col-span-3 order-1">
            <Navigation className="" />
          </div>

          {/* Routes - Main content */}
          <div className="md:col-span-6 order-3 md:order-2">
            <Routes className="" />
          </div>

          {/* Stats & Info - Right sidebar on desktop, second on mobile */}
          <div className="md:col-span-3 order-2 md:order-3 flex flex-col gap-6">
            <Stats className="" />
            <Info className="" />
          </div>
        </div>
      </div>
    </div>
  )
}
