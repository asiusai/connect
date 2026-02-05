import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { CircleAlertIcon, LoaderIcon } from 'lucide-react'
import { api } from '../api'
import { Logo } from '../../../shared/components/Logo'
import { useAuth } from '../hooks/useAuth'
import { getUserName } from '../../../shared/helpers'

export const Component = () => {
  const { provider, logIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const { mutate, error } = api.auth.auth.useMutation({
    onSuccess: async (data) => {
      const user = await api.auth.me.query({ extraHeaders: { Authorization: `JWT ${data.access_token}` } })
      if (user.status !== 200) throw new Error(`Invalid token`)
      logIn({ token: data.access_token, provider, name: getUserName(user.body), id: user.body.id })
      navigate('/')
    },
  })

  const code = params.get('code')
  const authProvider = params.get('provider')

  useEffect(() => {
    if (!code || !authProvider) return
    mutate({ body: { code, provider: authProvider } })
  }, [code, authProvider, mutate])

  if (!code || !authProvider) return <Navigate to="/login" />
  return (
    <div className="flex min-h-screen max-w-lg flex-col gap-8 items-center mx-auto justify-center p-6">
      <div className="flex flex-col gap-4 items-center">
        <Logo provider={provider} className="h-24 w-24" />
        <h1 className="text-2xl">{provider} connect</h1>
      </div>
      {error ? (
        <>
          <div className="flex gap-4 items-center">
            <CircleAlertIcon className="text-error shrink-0 text-2xl" />
            <span className="text-md">{String(error)}</span>
          </div>
          <Button color="secondary" href="/login">
            Try again
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <LoaderIcon className="animate-spin text-2xl" />
          <p className="text-lg">authenticating</p>
        </div>
      )}
    </div>
  )
}
