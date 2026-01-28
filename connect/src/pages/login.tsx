import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ButtonBase } from '../components/ButtonBase'
import { XIcon } from 'lucide-react'
import { Logo } from '../../../shared/components/Logo'
import { env } from '../../../shared/env'
import { Provider, PROVIDERS } from '../../../shared/provider'
import { cn } from '../../../shared/helpers'

type SavedAccount = {
  provider: Provider
  email: string
  id: string
}

const MOCK_SAVED_ACCOUNTS: SavedAccount[] = []

const stringify = (obj: Record<string, string>) => new URLSearchParams(obj).toString()

const SavedAccounts = () => {
  if (MOCK_SAVED_ACCOUNTS.length === 0) return null

  return (
    <div className="flex flex-col gap-3 w-full">
      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Continue as</span>
      <div className="flex flex-col gap-2">
        {MOCK_SAVED_ACCOUNTS.map((account) => (
          <div key={account.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Logo provider={account.provider} className="w-6 h-6" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{account.email}</span>
              <span className="text-xs text-white/40 capitalize">{PROVIDERS[account.provider].name}</span>
            </div>
            <button
              className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const ProviderTabs = ({ selected, onSelect }: { selected: Provider; onSelect: (p: Provider) => void }) => {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Select provider</span>
      <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl">
        {Provider.options.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium transition-all',
              selected === p ? 'bg-white text-black' : 'hover:bg-white/5 text-white/60 hover:text-white',
            )}
          >
            <Logo provider={p} className="w-5 h-5" />
            <span className="capitalize">{PROVIDERS[p].name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const ProviderSection = ({ provider }: { provider: Provider }) => {
  const info = PROVIDERS[provider]

  const state = `service,${window.location.hostname !== 'localhost' && provider === 'comma' ? env.HACK_LOGIN_CALLBACK_HOST : window.location.host}`

  const loginProviders = [
    {
      name: 'github',
      title: 'GitHub',
      image: '/logo-github.svg',
      href: info.githubClientId
        ? `https://github.com/login/oauth/authorize?${stringify({
            client_id: info.githubClientId,
            redirect_uri: `${info.authUrl}/v2/auth/h/redirect/`,
            scope: provider === 'asius' ? 'user:email' : 'read:user',
            state,
          })}`
        : undefined,
    },
    {
      name: 'google',
      title: 'Google',
      image: '/logo-google.svg',
      href: info.googleClientId
        ? `https://accounts.google.com/o/oauth2/auth?${stringify({
            type: 'web_server',
            client_id: info.googleClientId,
            redirect_uri: `${info.authUrl}/v2/auth/g/redirect/`,
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
      href: info.appleClientId
        ? `https://appleid.apple.com/auth/authorize?${stringify({
            client_id: info.appleClientId,
            redirect_uri: `${info.authUrl}/v2/auth/a/redirect/`,
            response_type: 'code',
            response_mode: 'form_post',
            scope: 'name email',
            state,
          })}`
        : undefined,
    },
  ]

  const availableProviders = loginProviders.filter(({ href }) => href)
  if (availableProviders.length === 0) return null

  return (
    <div className="flex flex-col gap-3 w-full min-h-50">
      {availableProviders.map(({ name, href, image, title }) => (
        <ButtonBase
          key={name}
          className="h-14 gap-4 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all active:scale-[0.98] flex items-center justify-center relative"
          href={href}
        >
          <div className="absolute left-4 w-6 h-6 flex items-center justify-center">
            <img src={image} alt="" className="w-full h-full object-contain" />
          </div>
          <span>Sign in with {title}</span>
        </ButtonBase>
      ))}
    </div>
  )
}

export const Component = () => {
  const navigate = useNavigate()
  const [selectedProvider, setSelectedProvider] = useState<Provider>('asius')
  const hasSavedAccounts = MOCK_SAVED_ACCOUNTS.length > 0

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 pt-24 pb-16 bg-background text-foreground">
      <div className={cn('flex flex-col items-center gap-10 w-full', hasSavedAccounts ? 'max-w-4xl' : 'max-w-md')}>
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome to Connect</h1>
          <p className="text-lg text-white/60 mt-2">Manage your openpilot experience</p>
        </div>

        <div className={cn('gap-8 w-full', hasSavedAccounts ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col')}>
          <div className="flex flex-col gap-6">
            <ProviderTabs selected={selectedProvider} onSelect={setSelectedProvider} />
            <ProviderSection provider={selectedProvider} />

            <button onClick={() => navigate('/demo')} className="text-sm text-white/40 hover:text-white/60 transition-colors">
              Try the demo →
            </button>
          </div>

          {hasSavedAccounts && (
            <div className="flex flex-col">
              <SavedAccounts />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
