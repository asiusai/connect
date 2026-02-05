import { Outlet } from 'react-router-dom'
import { api } from '../api'
import { useRouteParams } from '../hooks'
import { Loading } from '../components/Loading'
import { Button } from '../components/Button'
import { CircleAlertIcon } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'
import { Provider } from '../../../shared/provider'
import { Logo } from '../../../shared/components/Logo'

const RouteNotFound = () => {
  const { provider, setProvider } = useAuth()
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-background text-background-x">
      <CircleAlertIcon className="text-error text-5xl" />
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold text-primary">
          Route not found on <span className="text-error">{provider}</span>
        </h1>
        <p className="text-sm text-secondary-alt-x">Try switching providers</p>
      </div>
      <div className="flex gap-2">
        {Provider.options.map((x) => (
          <Button
            key={x}
            color={x === provider ? 'primary' : 'secondary'}
            leading={<Logo provider={x} className="size-5" />}
            onClick={() => {
              setProvider(x)
              window.location.reload()
            }}
          >
            {x}
          </Button>
        ))}
      </div>
    </div>
  )
}

export const Component = () => {
  const { routeName, dongleId } = useRouteParams()
  const [route, { loading }] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const { lastDongleId, set } = useSettings()
  const { token } = useAuth()

  useEffect(() => {
    if (dongleId && dongleId !== lastDongleId) {
      set({ lastDongleId: dongleId })
    }
  }, [dongleId, lastDongleId, set])

  if (loading) return <Loading className="h-screen w-screen" />

  if (!route) return <RouteNotFound />

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {token && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
