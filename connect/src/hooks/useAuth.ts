import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROVIDER, DEFAULT_PROVIDERS, Provider, ProviderInfo } from '../../../shared/provider'

type Login = { provider: Provider; token: string; name: string; id: string }

type Store = {
  id: string | undefined
  token: string | undefined
  provider: Provider
  providers: Record<string, ProviderInfo>
  logins: Login[]
  logIn: (login: Login) => void
  logOut: (id?: string) => void
  setProvider: (provider: Provider) => void
  addProvider: (info: ProviderInfo) => void
  removeProvider: (name: string) => void
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
      setProvider: (provider: Provider) => {
        const user = get().logins.find((x) => x?.provider === provider)
        set(() => ({ provider, id: user?.id, token: user?.token }))
      },
      addProvider: (info: ProviderInfo) => {
        set((x) => ({ providers: { ...x.providers, [info.name]: info } }))
      },
      removeProvider: (name: string) => {
        set((x) => {
          const { [name]: _, ...rest } = x.providers
          return { providers: rest }
        })
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
)
