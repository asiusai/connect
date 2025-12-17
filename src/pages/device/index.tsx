import { Loading } from '../../components/Loading'
import { useDevice } from '../../api/queries'
import { Location } from './Location'
import { Routes } from './Routes'
import { Stats } from './Stats'
import { Info } from './Info'
import { ActionBar } from './ActionBar'
import { Navigation } from './Navigation'
import { UserMobile } from './UserMobile'
import { useRouteParams, useScroll } from '../../utils/hooks'
import { DevicesMobile } from './DevicesMobile'
import { Icon } from '../../components/Icon'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [device, { isLoading, error }] = useDevice(dongleId)

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
        <Location devices={device ? [device] : []} className="h-full w-full" />
        <div className="absolute z-[999] top-0 w-full flex justify-between p-4 md:hidden">
          <DevicesMobile />
          <UserMobile />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-background z-[999]" style={{ opacity: scroll / height }} />
      </div>

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
