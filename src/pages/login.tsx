import { useNavigate } from 'react-router-dom'
import { Button } from '../components/material/Button'
import { Icon } from '../components/material/Icon'
import { API_URL, DEMO_ACCESS_TOKEN } from '../utils/consts'
import { getService, setAccessToken } from '../utils/helpers'

const stringify = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

const GOOGLE_OAUTH_PARAMS = {
  type: 'web_server',
  client_id: '45471411055-ornt4svd2miog6dnopve7qtmh5mnu6id.apps.googleusercontent.com',
  redirect_uri: `${API_URL}/v2/auth/g/redirect/`,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/userinfo.email',
  prompt: 'select_account',
}
export const getGoogleAuthUrl = () => {
  const params = {
    ...GOOGLE_OAUTH_PARAMS,
    state: 'service,' + getService(),
  }
  return 'https://accounts.google.com/o/oauth2/auth?' + stringify(params)
}

const APPLE_OAUTH_PARAMS = {
  client_id: 'ai.comma.login',
  redirect_uri: `${API_URL}/v2/auth/a/redirect/`,
  response_type: 'code',
  response_mode: 'form_post',
  scope: 'name email',
}
export const getAppleAuthUrl = () => {
  const params = {
    ...APPLE_OAUTH_PARAMS,
    state: 'service,' + getService(),
  }
  return 'https://appleid.apple.com/auth/authorize?' + stringify(params)
}

const GITHUB_OAUTH_PARAMS = {
  client_id: '28c4ecb54bb7272cb5a4',
  redirect_uri: `${API_URL}/v2/auth/h/redirect/`,
  scope: 'read:user',
}
export const getGitHubAuthUrl = () => {
  const params = {
    ...GITHUB_OAUTH_PARAMS,
    state: 'service,' + getService(),
  }
  return 'https://github.com/login/oauth/authorize?' + stringify(params)
}

export const Component = () => {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-8">
        <img src="/images/logo-connect-light.svg" alt="comma connect" width={96} height={96} />

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-extrabold md:mt-4">comma connect</h1>
          <p className="text-md">Manage your openpilot experience.</p>
        </div>

        <div className="flex flex-col items-stretch gap-4 self-stretch">
          <Button
            className="h-14 gap-4 min-[411px]:h-16"
            href={getGoogleAuthUrl()}
            leading={<img src="/images/logo-google.svg" alt="" width={32} height={32} />}
          >
            Sign in with Google
          </Button>
          <Button
            className="h-14 gap-4 min-[411px]:h-16"
            href={getAppleAuthUrl()}
            leading={<img src="/images/logo-apple.svg" alt="" width={32} height={32} />}
          >
            Sign in with Apple
          </Button>
          <Button
            className="h-14 gap-4 min-[411px]:h-16"
            href={getGitHubAuthUrl()}
            leading={<img src="/images/logo-github.svg" alt="" width={32} height={32} />}
          >
            Sign in with GitHub
          </Button>
        </div>

        <div className="flex justify-between gap-4">
          <p className="text-sm min-[411px]:text-base">
            Make sure to sign in with the same account if you have previously paired your comma three.
          </p>

          <img src="/images/icon-comma-three-light.svg" alt="" width={32} height={32} />
        </div>

        {/* TODO: Use href instead of onClick */}
        <Button onClick={() => navigate('/demo')} trailing={<Icon name="chevron_right" />}>
          Try the demo
        </Button>
      </div>
    </div>
  )
}
