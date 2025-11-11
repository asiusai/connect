import clsx from "clsx"
import { Navigate, Outlet } from "react-router-dom"
import { DeviceInfo } from "~/components/DeviceInfo"

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

  const getDefaultDongleId = () => {
    // Do not redirect if dongle ID already selected
    if (urlState().dongleId) return undefined

    const lastSelectedDongleId = storage.getItem('lastSelectedDongleId')
    if (devices.data?.some((device) => device.dongle_id === lastSelectedDongleId)) return lastSelectedDongleId
    return devices.data?.[0]?.dongle_id
  }

  if (getDefaultDongleId()) return <Navigate to={`/${getDefaultDongleId()}`} />

  return <div className="relative size-full overflow-hidden">
    <div
      className={clsx(
        'mx-auto size-full max-w-[1600px] md:grid md:grid-cols-2 lg:gap-2',
        // Flex layout for mobile with horizontal transition
        'flex transition-transform duration-300 ease-in-out',
        !!urlState().dateStr ? '-translate-x-full md:translate-x-0' : 'translate-x-0',
      )}
    >
      <div className="min-w-full overflow-y-scroll"><DeviceInfo dongleId={dongleId} /></div>
      <div className="min-w-full overflow-y-scroll"><Outlet /></div>
    </div>
  </div>
}
