import clsx from 'clsx'
import { Outlet, useParams } from 'react-router-dom'
import { DeviceInfo } from '~/components/DeviceInfo'

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
  const params = useParams()

  return (
    <div className="relative size-full overflow-hidden">
      <div
        className={clsx(
          'mx-auto size-full max-w-[1600px] md:grid md:grid-cols-2 lg:gap-2',
          // Flex layout for mobile with horizontal transition
          'flex transition-transform duration-300 ease-in-out',
          params.date ? '-translate-x-full md:translate-x-0' : 'translate-x-0',
        )}
      >
        <div className="min-w-full overflow-y-scroll">
          <DeviceInfo dongleId={params.dongleId!} />
        </div>
        <div className="min-w-full overflow-y-scroll">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
