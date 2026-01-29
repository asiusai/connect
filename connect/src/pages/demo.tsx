import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProviderInfo, Provider, PROVIDERS } from '../../../shared/provider'

export const Component = () => {
  const [params] = useSearchParams()
  const { provider, setProvider, logIn } = useAuth()

  const providerParam = params.get('provider')
  if (providerParam && Provider.safeParse(providerParam).success) {
    const p = providerParam as Provider
    if (p !== provider) {
      setProvider(p)
      logIn(PROVIDERS[p].demoAccessToken)
      return <Navigate to="/" />
    }
  }

  logIn(getProviderInfo(provider).demoAccessToken)
  return <Navigate to="/" />
}
