import clsx from 'clsx'
import { Outlet, useLocation } from 'react-router-dom'
import { DeviceInfo } from '../components/DeviceInfo'
import { useParams } from '../utils/hooks'

export const parseRouteId = (pathname: string) => {
  const parts = pathname.split('/').slice(1).filter(Boolean)
  const startTime = parts[2] ? Math.max(Number(parts[2]), 0) : 0
  const endTime = parts[3] ? Math.max(Number(parts[3]), startTime + 1) : undefined
  return {
    dongleId: parts[0] as string | undefined,
    dateStr: parts[1] as string | undefined,
    startTime,
    endTime,
  }
}

export const Component = () => {
  const location = useLocation()
  const isSubpageOpen = location.pathname.split('/').filter(Boolean).length > 1

  return (
    <div className="relative size-full overflow-hidden">
      <div
        className={clsx(
          'mx-auto size-full lg:gap-2',
          // Flex layout for mobile with horizontal transition
          'flex transition-transform duration-300 ease-in-out',
          isSubpageOpen ? '-translate-x-full md:translate-x-0 md:grid md:grid-cols-2' : 'translate-x-0',
        )}
      >
        <DeviceInfo />
        {isSubpageOpen && (
          <div className="min-w-full overflow-y-scroll relative h-screen">
            <Outlet />
          </div>
        )}
      </div>
    </div>
  )
}
