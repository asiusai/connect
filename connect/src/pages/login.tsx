import { useNavigate } from 'react-router-dom'
import { ButtonBase } from '../components/ButtonBase'
import { ChevronRightIcon } from 'lucide-react'
import { Logo } from '../../../shared/components/Logo'
import { env } from '../../../shared/env'
import { useProvider } from '../utils/storage'
import { Provider } from '../../../shared/provider'
import { cn } from '../../../shared/helpers'

const stringify = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

const ProviderSwitcher = ({ value, onChange }: { value: Provider; onChange: (p: Provider) => void }) => (
  <div className="flex p-1 rounded-full bg-white/5 border border-white/10">
    {Provider.options.map((p) => (
      <button
        key={p}
        onClick={() => onChange(p)}
        className={cn(
          'flex items-center justify-center gap-2 w-24 py-2 rounded-full text-sm font-medium transition-all',
          value === p ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5',
        )}
      >
        <Logo provider={p} className="w-4 h-4" />
        <span className="capitalize">{p}</span>
      </button>
    ))}
  </div>
)

export const Component = () => {
  const [provider, setProvider] = useProvider()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="flex max-w-sm w-full flex-col items-center gap-10">
        <ProviderSwitcher value={provider.name} onChange={setProvider} />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl border border-white/5">
            <Logo provider={provider.name} className="text-black h-16 w-16" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{provider.title}</h1>
            <p className="text-white/60">Manage your openpilot experience.</p>
          </div>
        </div>

        <ProviderLogin />
      </div>
    </div>
  )
}

const ProviderLogin = () => {
  const navigate = useNavigate()
  const [provider] = useProvider()

  // When using comma provider and not on localhost, then we need to go through a new-connect proxy
  const state = `service,${window.location.hostname !== 'localhost' && provider.name === 'comma' ? env.HACK_LOGIN_CALLBACK_HOST : window.location.host}`

  const loginProviders = [
    {
      name: 'google',
      title: 'Google',
      image: '/logo-google.svg',
      href: provider.googleClientId
        ? `https://accounts.google.com/o/oauth2/auth?${stringify({
            type: 'web_server',
            client_id: provider.googleClientId,
            redirect_uri: `${provider.authUrl}/v2/auth/g/redirect/`,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/userinfo.email',
            prompt: 'select_account',
            state,
          })}`
        : undefined,
    },
    {
      name: 'apple',
      title: 'Apple',
      image: '/logo-apple.svg',
      href: provider.appleClientId
        ? `https://appleid.apple.com/auth/authorize?${stringify({
            client_id: provider.appleClientId,
            redirect_uri: `${provider.authUrl}/v2/auth/a/redirect/`,
            response_type: 'code',
            response_mode: 'form_post',
            scope: 'name email',
            state,
          })}`
        : undefined,
    },
    {
      name: 'github',
      title: 'GitHub',
      image: '/logo-github.svg',
      href: provider.githubClientId
        ? `https://github.com/login/oauth/authorize?${stringify({
            client_id: provider.githubClientId,
            redirect_uri: `${provider.authUrl}/v2/auth/h/redirect/`,
            scope: provider.name === 'asius' ? 'user:email' : 'read:user',
            state,
          })}`
        : undefined,
    },
  ]

  return (
    <>
      <div className="flex flex-col items-stretch gap-3 self-stretch min-h-50">
        {loginProviders
          .filter(({ href }) => href)
          .map(({ name, href, image, title }) => (
            <ButtonBase
              key={name}
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
          <p className="text-xs text-white/60 leading-relaxed">Make sure to sign in with the same account if you have previously paired your device.</p>
        </div>

        {provider.demoAccessToken && (
          <ButtonBase
            onClick={() => navigate('/demo')}
            className="w-full py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group"
          >
            <span>Try the demo</span>
            <ChevronRightIcon className="text-white/60 group-hover:translate-x-1 transition-transform" />
          </ButtonBase>
        )}
      </div>
    </>
  )
}
