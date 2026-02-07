import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROVIDER, DEFAULT_PROVIDERS, ProviderInfo } from '../../../shared/provider'

type Login = { provider: string; token: string; name: string; id: string }

type Store = {
  id: string | undefined
  token: string | undefined
  provider: string
  providers: Record<string, ProviderInfo>
  logins: Login[]
  logIn: (login: Login) => void
  logOut: (id?: string) => void
  setProvider: (provider: string) => void
  addProvider: (info: ProviderInfo) => void
}

export const useAuth = create(
  persist<Store>(
    (set, get) => ({
      provider: DEFAULT_PROVIDER,
      providers: DEFAULT_PROVIDERS,
      id: undefined,
      token: undefined,
      logins: [],
      logIn: ({ provider, id, name, token }) => {
        if (!provider) provider = get().provider
        set((x) => ({
          provider,
          token,
          id,
          logins: [...x.logins.filter((x) => x.id !== id), { provider, token, name, id }],
        }))
      },
      logOut: (id?: string) => {
        if (!id) id = get().id
        const isCurrent = id === get().id
        set((x) => ({
          ...(isCurrent ? { id: undefined, token: undefined } : {}),
          logins: x.logins.filter((x) => x.id !== id),
        }))
      },
      setProvider: (provider: string) => {
        const user = get().logins.find((x) => x?.provider === provider)
        set(() => ({ provider, id: user?.id, token: user?.token }))
      },
      addProvider: (info: ProviderInfo) => {
        set((x) => ({ providers: { ...x.providers, [info.id]: info } }))
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
)

export const useProviderInfo = () => {
  const provider = useAuth((x) => x.provider)
  const providers = useAuth((x) => x.providers)
  return providers[provider]
}
