import { z } from 'zod'

export const Mode = z.enum(['asius', 'comma', 'konik', 'dev'])
export type Mode = z.infer<typeof Mode>

export const Provider = z.object({
  MODE: Mode,
  IS_OURS: z.coerce.boolean(),

  NAME: z.string(),
  FAVICON: z.string(),

  ATHENA_URL: z.string(),
  API_URL: z.string(),
  AUTH_URL: z.string(),
  BILLING_URL: z.string().optional(),
  CONNECT_URL: z.string(),

  DEMO_DONGLE_ID: z.string(),
  DEMO_ROUTE_ID: z.string(),
  DEMO_ACCESS_TOKEN: z.string(),

  HACK_LOGIN_CALLBACK_HOST: z.string().optional(),
  HACK_DEFAULT_REDICT_HOST: z.string().optional(),

  EXAMPLE_ROUTE_NAME: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
})
export type Provider = z.infer<typeof Provider>

const comma: Provider = {
  MODE: 'comma',
  IS_OURS: false,
  NAME: 'comma connect',
  FAVICON: '/comma-favicon.svg',

  ATHENA_URL: 'https://athena-comma-proxy.asius.ai',
  API_URL: 'https://api.comma.ai',
  AUTH_URL: 'https://api.comma.ai',
  BILLING_URL: 'https://billing-comma-proxy.asius.ai',
  CONNECT_URL: 'https://comma.asius.ai',

  DEMO_DONGLE_ID: '9748a98e983e0b39',
  DEMO_ROUTE_ID: '0000002c--d68dde99ca',
  DEMO_ACCESS_TOKEN:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzYwMDgwODcsIm5iZiI6MTc2ODIzMjA4NywiaWF0IjoxNzY4MjMyMDg3LCJpZGVudGl0eSI6IjE4ZWQ3ZWM1MGZmZmU5YTYifQ.FD77OD9sX8Gq8fiOJrNaccz4ovNvd2dgIVIfX69_Nsg',

  HACK_LOGIN_CALLBACK_HOST: '612.connect-d5y.pages.dev',
  HACK_DEFAULT_REDICT_HOST: 'comma.asius.ai',

  EXAMPLE_ROUTE_NAME: 'a2a0ccea32023010/2023-07-27--13-01-19',

  GOOGLE_CLIENT_ID: '45471411055-ornt4svd2miog6dnopve7qtmh5mnu6id.apps.googleusercontent.com',
  APPLE_CLIENT_ID: 'ai.comma.login',
  GITHUB_CLIENT_ID: '28c4ecb54bb7272cb5a4',
}

const konik: Provider = {
  MODE: 'konik',
  IS_OURS: false,
  NAME: 'konik connect',
  FAVICON: '/konik-favicon.svg',

  ATHENA_URL: 'https://api-konik-proxy.asius.ai/ws',
  API_URL: 'https://api-konik-proxy.asius.ai',
  AUTH_URL: 'https://api.konik.ai',
  CONNECT_URL: 'https://konik.asius.ai',

  GITHUB_CLIENT_ID: 'Ov23liy0AI1YCd15pypf',

  DEMO_ACCESS_TOKEN:
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpZGVudGl0eSI6IjI1ZmM2ODY1LTkzNTYtNDQzMS1hYWE1LTUxNmFjYTlhNWI1YyIsIm5iZiI6MTc2ODIyNzE3NiwiaWF0IjoxNzY4MjI3MTc2LCJleHAiOjE3NzYwMDMxNzZ9.OVIIzXn5CdxfuV1WJdZHeoLl8sFNNbIWaf694XWlkFq6BQ8isYu0WpSjWiA4eU7RtZt0P5qWHPbVjVs6iMJPLw',
  DEMO_DONGLE_ID: 'edf69f3fa55ca722',
  DEMO_ROUTE_ID: '0000002b--abc7a490ca',
}
const asius: Provider = {
  MODE: 'asius',
  IS_OURS: true,

  NAME: 'asius connect',
  FAVICON: '/asius-favicon.svg',

  ATHENA_URL: 'https://api.asius.ai',
  API_URL: 'https://api.asius.ai',
  AUTH_URL: 'https://api.asius.ai',
  CONNECT_URL: 'https://connect.asius.ai',

  GOOGLE_CLIENT_ID: '888462999677-0kqf5j0rkfvd47j7d34pnjsf29gqr39p.apps.googleusercontent.com',
  GITHUB_CLIENT_ID: 'Ov23li0TAhCMsk5poUJw',

  DEMO_ACCESS_TOKEN:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eSI6IjYxMDA4MDY1NjcxMjU3YmIiLCJpYXQiOjE3NjgyMjY5MzEsImV4cCI6MTc5OTc2MjkzMX0.9fnF0nu2f7ZJidtyQGCxL60ZcQ1yrdQeiCjQzWaQyyg',
  DEMO_DONGLE_ID: '1ce5b966287a55e9',
  DEMO_ROUTE_ID: '0000002b--abc7a490ca',
}
const dev: Provider = {
  ...asius,
  MODE: 'dev',

  ATHENA_URL: 'http://localhost:8080',
  API_URL: 'http://localhost:8080',
  AUTH_URL: 'http://localhost:8080',
  CONNECT_URL: 'http://localhost:4000',
}

export const PROVIDERS = { comma, konik, asius, dev }

const sysEnv = typeof process !== 'undefined' ? process.env : import.meta.env

export const mode = Mode.safeParse(sysEnv.MODE).success ? (sysEnv.MODE! as Mode) : 'asius'

export const provider = PROVIDERS[mode]
