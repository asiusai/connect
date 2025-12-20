import { Outlet } from 'react-router-dom'
import { DeviceParamsProvider } from '../pages/device/DeviceParamsContext'

export const Component = () => (
  <DeviceParamsProvider>
    <Outlet />
  </DeviceParamsProvider>
)
