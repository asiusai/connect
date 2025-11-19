import { Navigate, Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useDevices } from '../api/queries'
import { isSignedIn, storage } from '../utils/helpers'

const LoggedIn = () => {
  const [devices] = useDevices()
  const isHome = useLocation().pathname.replace('/', '') === ''

  // Wait for the devices to load
  if (!devices) return null

  // We never want them to at /
  if (isHome) {
    const getDefaultDongleId = () => {
      let lastSelectedDongleId = storage.getItem('lastSelectedDongleId')
      if (devices.some((device) => device.dongle_id === lastSelectedDongleId)) return lastSelectedDongleId
      return devices[0]?.dongle_id
    }
    if (getDefaultDongleId()) return <Navigate to={`/${getDefaultDongleId()}`} />
    else return <Navigate to="/first-pair" />
  }

  return <Outlet />
}

export const Component = () => {
  if (!isSignedIn()) return <Navigate to="/login" />
  return <LoggedIn />
}
