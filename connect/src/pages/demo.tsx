import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProviderInfo, Provider } from '../../../shared/provider'
import { useEffect } from 'react'

export const Component = () => {
  const [params] = useSearchParams()
  let { provider, logIn } = useAuth()

  useEffect(() => {
    const providerParam = Provider.safeParse(params.get('provider'))
    if (providerParam.success) provider = providerParam.data

    const token = getProviderInfo(provider).demoAccessToken
    logIn({ token, provider, name: 'Demo account', id: 'demo' })
  }, [])

  return <Navigate to="/" />
}
