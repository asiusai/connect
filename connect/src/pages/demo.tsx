import { Navigate, useSearchParams } from 'react-router-dom'
import { setAccessToken } from '../utils/helpers'
import { useProvider } from '../utils/useProvider'
import { Provider, PROVIDERS } from '../../../shared/provider'

export const Component = () => {
  const [params] = useSearchParams()
  const [provider, setProvider] = useProvider()

  const providerParam = params.get('provider')
  if (providerParam && Provider.safeParse(providerParam).success) {
    const p = providerParam as Provider
    if (p !== provider.name) {
      setProvider(p)
      setAccessToken(PROVIDERS[p].demoAccessToken)
      return <Navigate to="/" />
    }
  }

  setAccessToken(provider.demoAccessToken)
  return <Navigate to="/" />
}
