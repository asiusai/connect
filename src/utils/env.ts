import { Provider, PROVIDERS, Providers } from './providers'

const sysEnv = typeof process !== 'undefined' ? process.env : import.meta.env

const MODE = Providers.safeParse(sysEnv.MODE).success ? (sysEnv.MODE! as Providers) : 'dev'

export const env = Provider.parse(Object.fromEntries(Object.entries({ ...PROVIDERS[MODE], ...sysEnv }).map(([k, v]) => [k.replace('VITE_', ''), v])))
