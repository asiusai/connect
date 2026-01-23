import { Outlet } from 'react-router-dom'
import { api } from '../api'
import { useRouteParams } from '../hooks'
import { Loading } from '../components/Loading'
import { Button } from '../components/Button'
import { CircleAlertIcon, HomeIcon, RefreshCwIcon } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { isSignedIn } from '../utils/helpers'
import { useStorage } from '../utils/storage'
import { useEffect } from 'react'

const RouteNotFound = () => {
  const { routeName } = useRouteParams()
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-background text-background-x">
      <div className="flex flex-col items-center gap-2">
        <CircleAlertIcon className="text-error text-5xl" />
        <h1 className="flex flex-col items-center text-center text-2xl font-bold text-primary">Route {routeName} not found!</h1>
        <p className="text-secondary-alt-x">The route you are looking for does not exist or has been made private.</p>
      </div>
      <div className="flex gap-4">
        <Button color="secondary" leading={<RefreshCwIcon />} onClick={() => window.location.reload()}>
          Try again
        </Button>
        <Button color="primary" leading={<HomeIcon />} href="/">
          Go home
        </Button>
      </div>
    </div>
  )
}

export const Component = () => {
  const { routeName, dongleId } = useRouteParams()
  const [route, { loading }] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [lastDongleId, setLastDongleId] = useStorage('lastDongleId')

  useEffect(() => {
    if (dongleId && dongleId !== lastDongleId) {
      setLastDongleId(dongleId)
    }
  }, [dongleId, lastDongleId, setLastDongleId])

  if (loading) return <Loading className="h-screen w-screen" />

  if (!route) return <RouteNotFound />

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {isSignedIn() && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
