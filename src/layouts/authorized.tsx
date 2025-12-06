import { Navigate, Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useDevices } from '../api/queries'
import { isSignedIn } from '../utils/helpers'
import { Sidebar } from '../components/Sidebar'
import { useStorage } from '../utils/storage'

const RedirectFromHome = () => {
  const [devices] = useDevices()
  const [lastDongleId, setLastDongleId] = useStorage('lastDongleId')

  // Wait for the devices to load
  if (!devices) return null

  if (lastDongleId) return <Navigate to={`/${lastDongleId}`} />

  const firstDongleId = devices[0]?.dongle_id
  if (firstDongleId) {
    setLastDongleId(firstDongleId)
    return <Navigate to={`/${firstDongleId}`} />
  }

  return <Navigate to="/first-pair" />
}

export const Component = () => {
  const location = useLocation()

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
