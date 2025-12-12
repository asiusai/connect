import { useNavigate, useSearchParams } from 'react-router-dom'
import { ButtonBase } from '../components/ButtonBase'
import { Icon } from '../components/Icon'
import { env } from '../utils/env'
import { useEffect } from 'react'

const stringify = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

// Redirecting straight back on localhost, but elsewhere redirect to the HACK url
const state = `service,${window.location.hostname === 'localhost' || !env.HACK_LOGIN_CALLBACK_HOST ? window.location.host : env.HACK_LOGIN_CALLBACK_HOST}`

const GOOGLE_OAUTH_PARAMS = {
  type: 'web_server',
  client_id: env.GOOGLE_CLIENT_ID,
  redirect_uri: `${env.API_URL}/v2/auth/g/redirect/`,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/userinfo.email',
  prompt: 'select_account',
  state,
}

const APPLE_OAUTH_PARAMS = {
  client_id: env.APPLE_CLIENT_ID,
  redirect_uri: `${env.API_URL}/v2/auth/a/redirect/`,
  response_type: 'code',
  response_mode: 'form_post',
  scope: 'name email',
  state,
}

const GITHUB_OAUTH_PARAMS = {
  client_id: env.GITHUB_CLIENT_ID,
  redirect_uri: `${env.API_URL}/v2/auth/h/redirect/`,
  scope: 'read:user',
  state,
}

const PROVIDERS = {
  google: {
    enabled: !!env.GOOGLE_CLIENT_ID,
    href: `https://accounts.google.com/o/oauth2/auth?${stringify(GOOGLE_OAUTH_PARAMS)}`,
    image: '/images/logo-google.svg',
    title: 'Google',
  },
  apple: {
    enabled: !!env.APPLE_CLIENT_ID,
    href: `https://appleid.apple.com/auth/authorize?${stringify(APPLE_OAUTH_PARAMS)}`,
    image: '/images/logo-apple.svg',
    title: 'Apple',
  },
  github: {
    enabled: !!env.GITHUB_CLIENT_ID,
    href: `https://github.com/login/oauth/authorize?${stringify(GITHUB_OAUTH_PARAMS)}`,
    image: '/images/logo-github.svg',
    title: 'GitHub',
  },
}
type Provider = keyof typeof PROVIDERS

export const Component = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const provider = params.get('provider')

  useEffect(() => {
    if (provider && provider in PROVIDERS) window.location.href = PROVIDERS[provider as Provider].href
  }, [provider])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="flex max-w-sm w-full flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center shadow-2xl border border-white/5">
            <img src="/images/logo-connect-light.svg" alt="comma connect" width={64} height={64} className="opacity-90" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">comma connect</h1>
            <p className="text-white/60">Manage your openpilot experience.</p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 self-stretch">
          {Object.entries(PROVIDERS)
            .filter(([_, { enabled }]) => enabled)
            .map(([key, { href, image, title }]) => (
              <ButtonBase
                key={key}
                className="h-14 gap-4 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-[0.98] flex items-center justify-center relative overflow-hidden group"
                href={href}
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                  <img src={image} alt="" className="w-full h-full object-contain" />
                </div>
                <span>Sign in with {title}</span>
              </ButtonBase>
            ))}
        </div>

        <div className="flex flex-col gap-6 w-full">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <img src="/images/icon-comma-three-light.svg" alt="" width={24} height={24} className="opacity-80 mt-1" />
            <p className="text-xs text-white/60 leading-relaxed">
              Make sure to sign in with the same account if you have previously paired your comma three.
            </p>
          </div>

          <ButtonBase
            onClick={() => navigate('/demo')}
            className="w-full py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group"
          >
            <span>Try the demo</span>
            <Icon name="chevron_right" className="text-white/60 group-hover:translate-x-1 transition-transform" />
          </ButtonBase>
        </div>
      </div>
    </div>
  )
}
