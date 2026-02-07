import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'

export const Component = () => {
  const [params] = useSearchParams()
  let { provider, providers, logIn } = useAuth()

  useEffect(() => {
    const providerParam = params.get('provider')
    if (providerParam && providers[providerParam]) provider = providerParam

    const token = providers[provider].demoAccessToken!
    logIn({ token, provider, name: 'Demo account', id: `demo-${provider}` })
  }, [logIn, params, provider, providers])

  return <Navigate to="/" />
}
