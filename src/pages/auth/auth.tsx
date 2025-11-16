import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '~/components/material/Button'
import { Icon } from '~/components/material/Icon'
import { setAccessToken } from '~/utils/helpers'
import { API_URL } from '../../utils/consts'

// TODO: move this to API contract
export const refreshAccessToken = async (code: string, provider: string) => {
  try {
    const resp = await fetch(`${API_URL}/v2/auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ code, provider }),
    })

    if (!resp.ok) throw new Error(`${resp.status}: ${await resp.text()}`)

    // TODO: validate response
    const json = (await resp.json()) as Record<string, string>
    if (!json.access_token) throw new Error('unknown error')

    setAccessToken(json.access_token)
  } catch (e) {
    throw new Error('Could not exchange oauth code for access token', { cause: e })
  }
}

export const Component = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string>()

  const code = params.get('code')
  const provider = params.get('provider')

  useEffect(() => {
    if (!code || !provider) return
    refreshAccessToken(code, provider)
      .then(() => navigate('/'))
      .catch((err) => {
        console.error(err)
        if (err instanceof Error && err.message) setError(err.message)
        else setError('Something went wrong')
      })
  }, [code, provider, navigate])

  if (!code || !provider) return <Navigate to="/login" />
  return (
    <div className="flex min-h-screen max-w-lg flex-col gap-8 items-center mx-auto justify-center p-6">
      <div className="flex flex-col gap-4 items-center">
        <img src="/images/logo-connect-light.svg" alt="comma connect" width={96} height={96} />
        <h1 className="text-2xl">comma connect</h1>
      </div>
      {error ? (
        <>
          <div className="flex gap-4 items-center">
            <Icon className="text-error shrink-0" name="error" size="24" />
            <span className="text-md">{error}</span>
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
