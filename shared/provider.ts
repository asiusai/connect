import { z } from 'zod'

export const Provider = z.enum(['comma', 'konik', 'asius'])
export type Provider = z.infer<typeof Provider>

const sysEnv = typeof process !== 'undefined' ? process.env : import.meta.env

export const DEFAULT_PROVIDER = Provider.optional().parse(sysEnv.PROVIDER) ?? 'comma'
export const LOCAL = !!sysEnv.LOCAL

export const ProviderInfo = z.object({
  name: Provider,

  title: z.string(),
  favicon: z.string(),

  athenaUrl: z.string(),
  apiUrl: z.string(),
  authUrl: z.string(),
  billingUrl: z.string().optional(),
  connectUrl: z.string(),

  demoDongleId: z.string(),
  demoRouteId: z.string(),
  demoAccessToken: z.string(),

  googleClientId: z.string().optional(),
  appleClientId: z.string().optional(),
  githubClientId: z.string().optional(),

  loginCallbackHostHack: z.string().optional(),
})
export type ProviderInfo = z.infer<typeof ProviderInfo>

const comma: ProviderInfo = {
  name: 'comma',
  title: 'comma connect',
  favicon: '/comma-favicon.svg',

  athenaUrl: 'https://athena-comma-proxy.asius.ai',
  apiUrl: 'https://api.comma.ai',
  authUrl: 'https://api.comma.ai',
  billingUrl: 'https://billing-comma-proxy.asius.ai',
  connectUrl: 'https://connect.asius.ai',

  demoDongleId: '9748a98e983e0b39',
  demoRouteId: '0000002b--abc7a490ca',
  demoAccessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzYwMDgwODcsIm5iZiI6MTc2ODIzMjA4NywiaWF0IjoxNzY4MjMyMDg3LCJpZGVudGl0eSI6IjE4ZWQ3ZWM1MGZmZmU5YTYifQ.FD77OD9sX8Gq8fiOJrNaccz4ovNvd2dgIVIfX69_Nsg',

  googleClientId: '45471411055-ornt4svd2miog6dnopve7qtmh5mnu6id.apps.googleusercontent.com',
  appleClientId: 'ai.comma.login',
  githubClientId: '28c4ecb54bb7272cb5a4',
  loginCallbackHostHack: '613.connect-d5y.pages.dev',
}

const konik: ProviderInfo = {
  name: 'konik',
  title: 'konik connect',
  favicon: '/konik-favicon.svg',

  athenaUrl: 'https://api-konik-proxy.asius.ai/ws',
  apiUrl: 'https://api-konik-proxy.asius.ai',
  authUrl: 'https://api.konik.ai',
  connectUrl: 'https://connect.asius.ai',

  githubClientId: 'Ov23liy0AI1YCd15pypf',

  demoAccessToken:
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpZGVudGl0eSI6IjI1ZmM2ODY1LTkzNTYtNDQzMS1hYWE1LTUxNmFjYTlhNWI1YyIsIm5iZiI6MTc2ODIyNzE3NiwiaWF0IjoxNzY4MjI3MTc2LCJleHAiOjE3NzYwMDMxNzZ9.OVIIzXn5CdxfuV1WJdZHeoLl8sFNNbIWaf694XWlkFq6BQ8isYu0WpSjWiA4eU7RtZt0P5qWHPbVjVs6iMJPLw',
  demoDongleId: 'edf69f3fa55ca722',
  demoRouteId: '0000002b--abc7a490ca',
}

const asius: ProviderInfo = {
  name: 'asius',

  title: 'asius connect',
  favicon: '/asius-favicon.svg',

  athenaUrl: LOCAL ? 'http://localhost:8080' : 'https://api.asius.ai',
  apiUrl: LOCAL ? 'http://localhost:8080' : 'https://api.asius.ai',
  authUrl: LOCAL ? 'http://localhost:8080' : 'https://api.asius.ai',
  connectUrl: LOCAL ? 'http://localhost:4000' : 'https://connect.asius.ai',

  googleClientId: '888462999677-0kqf5j0rkfvd47j7d34pnjsf29gqr39p.apps.googleusercontent.com',
  githubClientId: 'Ov23li0TAhCMsk5poUJw',

  demoAccessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eSI6IjYxMDA4MDY1NjcxMjU3YmIiLCJpYXQiOjE3NjgyMjY5MzEsImV4cCI6MTc5OTc2MjkzMX0.9fnF0nu2f7ZJidtyQGCxL60ZcQ1yrdQeiCjQzWaQyyg',
  demoDongleId: '1ce5b966287a55e9',
  demoRouteId: '0000002b--abc7a490ca',
}

const PROVIDERS = { comma, konik, asius }

export const getProviderInfo = (mode: Provider) => PROVIDERS[mode]
