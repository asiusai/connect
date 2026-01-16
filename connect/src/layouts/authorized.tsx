import { Navigate, Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { useRouteParams } from '../utils/hooks'
import { isSignedIn, signOut } from '../utils/helpers'
import { Sidebar } from '../components/Sidebar'
import { useStorage } from '../utils/storage'
import { useEffect, useRef } from 'react'

const RedirectFromHome = () => {
  const [devices] = api.devices.devices.useQuery({})
  const [lastDongleId, setLastDongleId] = useStorage('lastDongleId')

  // Wait for the devices to load
  if (!devices) return null

  if (lastDongleId && devices.some((x) => x.dongle_id === lastDongleId)) return <Navigate to={`/${lastDongleId}`} />

  const firstDongleId = devices[0]?.dongle_id
  if (firstDongleId) {
    setLastDongleId(firstDongleId)
    return <Navigate to={`/${firstDongleId}`} />
  }

  return <Navigate to="/first-pair" />
}

export const Component = () => {
  const location = useLocation()
  const [_, { error, refetch }] = api.auth.me.useQuery({ enabled: isSignedIn() })
  const { dongleId } = useRouteParams()
  const [lastDongleId, setLastDongleId] = useStorage('lastDongleId')
  const errorCount = useRef(0)

  useEffect(() => {
    if (dongleId && dongleId !== lastDongleId) setLastDongleId(dongleId)
  }, [dongleId, lastDongleId, setLastDongleId])

  useEffect(() => {
    if (!error) {
      errorCount.current = 0
      return
    }

    errorCount.current++
    if (errorCount.current >= 2) signOut()
    else refetch()
  }, [error, refetch])

  if (!isSignedIn()) return <Navigate to="/login" />

  // We never want them to be at /
  if (location.pathname.replace('/', '') === '') return <RedirectFromHome />

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
