import { Navigate } from 'react-router-dom'
import { setAccessToken } from '../utils/helpers'
import { provider } from '../../../shared/provider'

export const Component = () => {
  setAccessToken(provider.DEMO_ACCESS_TOKEN)
  return <Navigate to="/" />
}
