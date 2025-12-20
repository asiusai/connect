import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loading } from '../../components/Loading'
import { useDevice } from '../../api/queries'
import { Location } from './Location'
import { Routes } from './Routes'
import { Stats } from './Stats'
import { Info } from './Info'
import { ActionBar } from './ActionBar'
import { Navigation } from './Navigation'
import { useRouteParams, useScroll } from '../../utils/hooks'
import { DevicesMobile } from './DevicesMobile'
import { Icon } from '../../components/Icon'
import { IconButton } from '../../components/IconButton'
import { useStorage } from '../../utils/storage'

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
        <div className="absolute z-[999] top-0 w-full flex justify-between p-4 md:hidden">
          <DevicesMobile />
          {usingCorrectFork && !searchOpen && (
            <IconButton name="search" title="Navigate" onClick={() => setSearchOpen(true)} className="bg-background/80 backdrop-blur-sm p-2 size-12 shrink-0" />
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-background z-[999]" style={{ opacity: scroll / height }} />
      </div>
      {usingCorrectFork &&
        !searchOpen &&
        createPortal(
          <IconButton
            name="search"
            title="Navigate"
            onClick={() => setSearchOpen(true)}
            className="fixed top-3 right-3 z-[9999] bg-background/80 backdrop-blur-sm p-2 hidden md:flex"
          />,
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
