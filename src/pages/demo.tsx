import { Navigate, useNavigate } from 'react-router-dom'
import { setAccessToken } from '../utils/helpers'
import { DEMO_ACCESS_TOKEN } from '../utils/consts'

export const Component = () => {
  setAccessToken(DEMO_ACCESS_TOKEN)
  return <Navigate to="/" />
}
