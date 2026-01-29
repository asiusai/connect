import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROVIDER, Provider } from '../../../shared/provider'

type Login = { provider: Provider; token: string; name: string; id: string }

type Store = {
  id: string | undefined
  token: string | undefined
  provider: Provider
  logins: Login[]
  logIn: (login: Login) => void
  logOut: (id?: string) => void
  setProvider: (provider: Provider) => void
}

export const useAuth = create(
  persist<Store>(
    (set, get) => ({
      provider: DEFAULT_PROVIDER,
      id: undefined,
      token: undefined,
      logins: [],
      logIn: ({ provider, id, name, token }) => {
        if (!provider) provider = get().provider
        const isDemo = id === 'demo'
        set((x) => ({
          provider,
          token,
          id,
          logins: isDemo ? x.logins : [...x.logins.filter((x) => x.id !== id), { provider, token, name, id }],
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
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
)
