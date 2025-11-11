import { Navigate } from 'react-router-dom'
import { signOut } from '~/api/auth/client'

export default () => {
  signOut()
  return <Navigate to="/login" />
}
