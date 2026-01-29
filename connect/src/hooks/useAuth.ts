import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROVIDER, Provider } from '../../../shared/provider'

type Login = { provider: Provider; token: string }

type Store = {
  provider: Provider
  token: string | undefined
  logins: Login[]
  logIn: (token: string, provider?: Provider) => void
  logOut: (token?: string) => void
  setProvider: (provider: Provider) => void
}
console.log('hello')

export const useAuth = create(
  persist<Store>(
    (set, get) => ({
      provider: DEFAULT_PROVIDER,
      token: undefined,
      logins: [],
      logIn: (token, provider) => {
        if (!provider) provider = get().provider
        set((x) => ({ provider, token, logins: [...x.logins, { provider, token }] }))
      },
      logOut: (token?: string) => {
        if (!token) token = get().token
        set((x) => ({ token: undefined, logins: x.logins.filter((x) => x.token !== token) }))
      },
      setProvider: (provider: Provider) => {
        const user = get().logins.find((x) => x.provider === provider)
        set(() => ({ provider, token: user?.token }))
      },
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
