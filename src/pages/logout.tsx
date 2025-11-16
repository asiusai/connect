import { Navigate } from 'react-router-dom'
import { signOut } from '../utils/helpers'

export const Component = () => {
  signOut()
  return <Navigate to="/login" />
}
