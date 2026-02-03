import { Loading } from '../../components/Loading'
import { api } from '../../api'
import { Location } from './Location'
import { Routes } from './Routes'
import { Stats } from './Stats'
import { Info } from './Info'
import { ActionBar } from './ActionBar'
import { useRouteParams, useScroll } from '../../hooks'
import { DevicesMobile } from './DevicesMobile'
import { Navigate } from 'react-router-dom'

export const Component = () => {
  const { dongleId } = useRouteParams()
  const [device, { loading, error }] = api.device.get.useQuery({ params: { dongleId }, enabled: !!dongleId })

  const scroll = useScroll()

  if (loading) return <Loading className="h-screen w-screen" />

  if (error) return <Navigate to="/" />

  const height = 400
  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="w-full sticky top-0" style={{ height }}>
        <Location device={device} className="h-full w-full" />
        <DevicesMobile />
        <div className="pointer-events-none absolute inset-0 bg-background z-999" style={{ opacity: scroll / height }} />
      </div>
      <div className="grid md:grid-cols-3 gap-10 p-6 bg-background relative">
        <div className="md:hidden absolute top-0 -translate-y-full py-2 flex w-full">
          <ActionBar className="mx-auto w-64 gap-4" />
        </div>
        <Routes className="md:col-span-2 row-span-3" />
        <Stats className="" />
        <Info className="" />
      </div>
    </div>
  )
}
