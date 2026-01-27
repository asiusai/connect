import { Navigate } from 'react-router-dom'
import { setAccessToken } from '../utils/helpers'
import { useProvider } from '../utils/storage'

export const Component = () => {
  const [provider] = useProvider()
  setAccessToken(provider.demoAccessToken)
  return <Navigate to="/" />
}
