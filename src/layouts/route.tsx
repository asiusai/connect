import { Outlet } from 'react-router-dom'
import { useRoute } from '../api/queries'
import { useParams } from '../utils/hooks'
import { Loading } from '../components/material/Loading'
import { Button } from '../components/material/Button'

const RouteNotFound = () => {
  const { routeName } = useParams()
  return (
    <div>
      {routeName} not found!
      <Button href="/">Go home</Button>
    </div>
  )
}

export const Component = () => {
  const { routeName } = useParams()
  const [route, { isLoading }] = useRoute(routeName)

  if (isLoading) return <Loading className="h-screen w-screen" />

  if (!route) return <RouteNotFound />

  return <Outlet />
}
