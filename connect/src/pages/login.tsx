import { useNavigate } from 'react-router-dom'
import { ButtonBase } from '../components/ButtonBase'
import { XIcon } from 'lucide-react'
import { Logo } from '../../../shared/components/Logo'
import { Provider } from '../../../shared/provider'
import { cn } from '../../../shared/helpers'
import { useAuth } from '../hooks/useAuth'
import { useLoginProviders } from '../hooks/useLoginProviders'

const SavedAccounts = () => {
  const navigate = useNavigate()
  const { logins, logOut, logIn } = useAuth()

  if (!logins.length) return null
  return (
    <div className="flex flex-col gap-3 w-full max-w-sm ">
      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">or continue as</span>
      <div className="flex flex-col gap-2">
        {logins.map((account, i) => (
          <div
            key={i}
            onClick={() => {
              logIn(account)
              navigate('/')
            }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Logo provider={account.provider} className="w-6 h-6" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{account.name}</span>
              <span className="text-xs text-white/40 capitalize">{account.provider}</span>
            </div>
            <button
              className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                logOut(account.id)
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

const ProviderSwitcher = () => {
  const { provider, setProvider } = useAuth()
  return (
    <div className="grid grid-cols-3 p-1 rounded-xl bg-white/5 border border-white/10 w-full">
      {Provider.options.map((p) => (
        <button
          key={p}
          onClick={() => setProvider(p)}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-medium transition-all',
            provider === p ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5',
          )}
        >
          <Logo provider={p} className="w-5 h-5" />
          <span className="capitalize">{p}</span>
        </button>
      ))}
    </div>
  )
}

const ProviderLogin = () => {
  const loginProviders = useLoginProviders()
  const navigate = useNavigate()
  return (
    <div className="flex max-w-sm w-full flex-col gap-3 min-h-84">
      <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Log in with</span>
      <ProviderSwitcher />

      {loginProviders.map(({ name, href, image, title }) => (
        <ButtonBase
          key={name}
          className={cn(
            'h-14 gap-4 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all flex items-center justify-center relative overflow-hidden group',
            !href && 'hidden',
          )}
          href={href}
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
            <img src={image} alt="" className="w-full h-full object-contain" />
          </div>
          <span>Sign in with {title}</span>
        </ButtonBase>
      ))}
      <ButtonBase onClick={() => navigate('/demo')} className="mt-auto text-sm text-white/40 hover:text-white/60 transition-colors p-2">
        Try the demo →
      </ButtonBase>
    </div>
  )
}

export const Component = () => {
  return (
    <div className="flex min-h-screen gap-10 flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl border border-white/5">
          <Logo provider={'asius'} className="text-black h-16 w-16" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Asius connect</h1>
      </div>

      <div className="w-full flex flex-col md:flex-row items- gap-10 justify-center">
        <ProviderLogin />

        <SavedAccounts />
      </div>
    </div>
  )
}
