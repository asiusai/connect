import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { api } from '../api'
import { setAccessToken } from '../utils/helpers'
import { Logo } from '../components/Logo'
import { env } from '../../../shared/env'

export const Component = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { mutate, error } = api.auth.auth.useMutation({
    onSuccess: (data) => {
      setAccessToken(data.access_token)
      navigate('/')
    },
  })

  const code = params.get('code')
  const provider = params.get('provider')

  useEffect(() => {
    if (!code || !provider) return
    mutate({ body: { code, provider } })
  }, [code, provider, navigate])

  if (!code || !provider) return <Navigate to="/login" />
  return (
    <div className="flex min-h-screen max-w-lg flex-col gap-8 items-center mx-auto justify-center p-6">
      <div className="flex flex-col gap-4 items-center">
        <Logo className="h-24 w-24" />
        <h1 className="text-2xl">{env.NAME}</h1>
      </div>
      {error ? (
        <>
          <div className="flex gap-4 items-center">
            <Icon className="text-error shrink-0 text-2xl" name="error" />
            <span className="text-md">{String(error)}</span>
          </div>
          <Button color="secondary" href="/login">
            Try again
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Icon className="animate-spin text-2xl" name="autorenew" />
          <p className="text-lg">authenticating</p>
        </div>
      )}
    </div>
  )
}
