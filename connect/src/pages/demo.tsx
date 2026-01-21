import { Navigate } from 'react-router-dom'
import { setAccessToken } from '../utils/helpers'
import { env } from '../../../shared/env'

export const Component = () => {
  setAccessToken(env.DEMO_ACCESS_TOKEN)
  return <Navigate to="/" />
}
