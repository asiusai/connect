import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { useRouteParams } from '../hooks'
import { Sidebar } from '../components/Sidebar'
import { useSettings } from '../hooks/useSettings'
import { useEffect, useRef } from 'react'
import { useOffline } from '../hooks/useOffline'
import { useAuth } from '../hooks/useAuth'

const RedirectFromHome = () => {
  const navigate = useNavigate()
  const [devices] = api.devices.devices.useQuery({})
  const { lastDongleId, set } = useSettings()

  useEffect(() => {
    if (!devices) return

    const firstDongleId = devices[0]?.dongle_id

    if (lastDongleId && devices.some((x) => x.dongle_id === lastDongleId)) navigate(`/${lastDongleId}`)
    else if (!firstDongleId) navigate('/first-pair')
    else {
      set({ lastDongleId: firstDongleId })
      navigate(`/${firstDongleId}`)
    }
  }, [devices, lastDongleId])

  return null
}

export const Component = () => {
  const location = useLocation()
  const { token, logOut } = useAuth()
  const [_, { error, refetch }] = api.auth.me.useQuery({ enabled: !!token })
  const { dongleId } = useRouteParams()
  const { lastDongleId, set } = useSettings()
  const errorCount = useRef(0)

  useEffect(() => {
    if (dongleId && dongleId !== lastDongleId) set({ lastDongleId: dongleId })
  }, [dongleId, lastDongleId])

  const isOnline = useOffline((s) => s.isOnline)

  useEffect(() => {
    if (!error || !isOnline) return

    errorCount.current++
    if (errorCount.current >= 2) logOut()
    else refetch()
  }, [error, refetch, isOnline])

  if (!token) return <Navigate to="/login" />

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
