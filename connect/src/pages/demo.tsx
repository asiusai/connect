import { Navigate } from 'react-router-dom'
import { setAccessToken } from '../utils/helpers'
import { env } from '../utils/env'
import { useStorage } from '../utils/storage'

export const Component = () => {
  setAccessToken(env.DEMO_ACCESS_TOKEN)
  const [val, set] =useStorage("lastDongleId")
  set(env.DEMO_DONGLE_ID)
  return <Navigate to="/" />
}
