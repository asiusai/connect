import { Navigate } from 'react-router-dom'
import { setAccessToken } from '../utils/helpers'
import { env } from '../utils/env'

export const Component = () => {
  setAccessToken(env.DEMO_ACCESS_TOKEN)
  return <Navigate to="/" />
}
