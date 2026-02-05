import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'

export const Component = () => {
  const { logOut } = useAuth()
  useEffect(() => logOut(), [logOut])
  return <Navigate to="/login" />
}
