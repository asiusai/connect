import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { refreshAccessToken } from '~/api/auth/client'
import { Button } from '~/components/material/Button'
import { Icon } from '~/components/material/Icon'
import { useCreateSignal } from '~/fix'

type AuthParams = {
  code: string
  provider: string
}

export const Component = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams<AuthParams>()
  const [error, setError] = useCreateSignal<string | null>(null)

  const { code, provider } = params
  if (code && provider) {
    void refreshAccessToken(code, provider)
      .then(() => navigate('/'))
      .catch((err) => {
        console.error(err)
        if (err instanceof Error && err.message) {
          setError(err.message)
        } else {
          setError('Something went wrong')
        }
      })
  }

  if (!code || !provider) return <Navigate to="/login" />
  return (
    <div className="flex min-h-screen max-w-lg flex-col gap-8 items-center mx-auto justify-center text-on-background bg-background p-6">
      <div className="flex flex-col gap-4 items-center">
        <img src="/images/logo-connect-light.svg" alt="comma connect" width={96} height={96} />
        <h1 className="text-2xl">comma connect</h1>
      </div>
      {error() ? (
        <>
          <div className="flex gap-4 items-center">
            <Icon className="text-error shrink-0" name="error" size="24" />
            <span className="text-md">{error()}</span>
          </div>
          <Button color="secondary" href="/login">
            Try again
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Icon className="animate-spin" name="autorenew" size="24" />
          <p className="text-lg">authenticating</p>
        </div>
      )}
    </div>
  )
}
