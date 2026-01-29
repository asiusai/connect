import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export const Component = () => {
  const { logOut } = useAuth()
  logOut()
  return <Navigate to="/login" />
}
