import { useNavigate } from 'react-router-dom'
import { ButtonBase } from '../components/ButtonBase'
import { Icon } from '../components/Icon'
import { env } from '../utils/env'
import { Logo } from '../components/Logo'

const stringify = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

// Redirecting straight back on localhost, but elsewhere redirect to the HACK url
const state = `service,${window.location.hostname === 'localhost' || !env.HACK_LOGIN_CALLBACK_HOST ? window.location.host : env.HACK_LOGIN_CALLBACK_HOST}`

const PROVIDERS = {
  google: {
    title: 'Google',
    image: '/logo-google.svg',
    href: env.GOOGLE_CLIENT_ID
      ? `https://accounts.google.com/o/oauth2/auth?${stringify({
          type: 'web_server',
          client_id: env.GOOGLE_CLIENT_ID,
          redirect_uri: `${env.AUTH_URL}/v2/auth/g/redirect/`,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/userinfo.email',
          prompt: 'select_account',
          state,
        })}`
      : undefined,
  },
  apple: {
    title: 'Apple',
    image: '/logo-apple.svg',
    href: env.APPLE_CLIENT_ID
      ? `https://appleid.apple.com/auth/authorize?${stringify({
          client_id: env.APPLE_CLIENT_ID,
          redirect_uri: `${env.AUTH_URL}/v2/auth/a/redirect/`,
          response_type: 'code',
          response_mode: 'form_post',
          scope: 'name email',
          state,
        })}`
      : undefined,
  },
  github: {
    title: 'GitHub',
    image: '/logo-github.svg',
    href: env.GITHUB_CLIENT_ID
      ? `https://github.com/login/oauth/authorize?${stringify({
          client_id: env.GITHUB_CLIENT_ID,
          redirect_uri: `${env.AUTH_URL}/v2/auth/h/redirect/`,
          scope: env.IS_OURS ? 'user:email' : 'read:user',
          state,
        })}`
      : undefined,
  },
}

export const Component = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="flex max-w-sm w-full flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl border border-white/5">
            <Logo className="text-black h-16 w-16" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{env.NAME}</h1>
            <p className="text-white/60">Manage your openpilot experience.</p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 self-stretch">
          {Object.entries(PROVIDERS)
            .filter(([_, { href }]) => href)
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
            <img src="/icon-comma-three-light.svg" alt="" width={24} height={24} className="opacity-80 mt-1" />
            <p className="text-xs text-white/60 leading-relaxed">Make sure to sign in with the same account if you have previously paired your comma device.</p>
          </div>

          {env.DEMO_ACCESS_TOKEN && (
            <ButtonBase
              onClick={() => navigate('/demo')}
              className="w-full py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group"
            >
              <span>Try the demo</span>
              <Icon name="chevron_right" className="text-white/60 group-hover:translate-x-1 transition-transform" />
            </ButtonBase>
          )}
        </div>
      </div>
    </div>
  )
}
