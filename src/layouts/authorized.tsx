import { Navigate, Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useDevices } from '../api/queries'
import { isSignedIn, storage } from '../utils/helpers'

const RedirectFromHome = () => {
  const [devices] = useDevices()

  // Wait for the devices to load
  if (!devices) return null

  const getDefaultDongleId = () => {
    let lastSelectedDongleId = storage.getItem('lastSelectedDongleId')
    if (devices.some((device) => device.dongle_id === lastSelectedDongleId)) return lastSelectedDongleId
    return devices[0]?.dongle_id
  }
  if (getDefaultDongleId()) return <Navigate to={`/${getDefaultDongleId()}`} />
  return <Navigate to="/first-pair" />
}

export const Component = () => {
  const location = useLocation()

  if (!isSignedIn()) return <Navigate to="/login" />

  // We never want them to be at /
  if (location.pathname.replace('/', '') === '') return <RedirectFromHome />
  return <Outlet />
}
