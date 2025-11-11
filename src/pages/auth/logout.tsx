import { Navigate } from 'react-router-dom'
import { signOut } from '~/api/auth/client'

export const Component = () => {
  signOut()
  return <Navigate to="/login" />
}
