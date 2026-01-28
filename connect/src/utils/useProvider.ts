import { getProvider, Provider } from '../../../shared/provider'
import { useStorage } from './storage'

export const useProvider = () => {
  const provider = useStorage((x) => x.provider)
  const set = useStorage((x) => x.set)
  return [getProvider(provider), (provider: Provider) => set({ provider })] as const
}
