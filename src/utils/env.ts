import { z } from 'zod'

export const Mode = z.enum(['comma', 'konik', 'asius', 'dev'])
export type Mode = z.infer<typeof Mode>

export const Environment = z.object({
  MODE: Mode.default('comma'),
  ATHENA_URL: z.string().default('https://athena-comma-proxy.asius.ai'),
  API_URL: z.string().default('https://api.comma.ai'),
  AUTH_URL: z.string().default('https://api.comma.ai'),
  BILLING_URL: z.string().default('https://billing-comma-proxy.asius.ai'),
  USERADMIN_URL: z.string().default('https://useradmin.comma.ai'),

  DEMO_DONGLE_ID: z.string().default('1d3dc3e03047b0c7'),
  DEMO_ACCESS_TOKEN: z
    .string()
    .default(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjEwMzg5NTgwNzM1LCJuYmYiOjE3NDk1ODA3MzUsImlhdCI6MTc0OTU4MDczNSwiaWRlbnRpdHkiOiIwZGVjZGRjZmRmMjQxYTYwIn0.KsDzqJxgkYhAs4tCgrMJIdORyxO0CQNb0gHXIf8aUT0',
    ),

  MAPBOX_USERNAME: z.string().default('commaai'),
  MAPBOX_LIGHT_STYLE_ID: z.string().default('clcl7mnu2000214s2zgcdly6e'),
  MAPBOX_DARK_STYLE_ID: z.string().default('clcgvbi4f000q15t6o2s8gys3'),
  MAPBOX_TOKEN: z.string().default('pk.eyJ1IjoiY29tbWFhaSIsImEiOiJjangyYXV0c20wMGU2NDluMWR4amUydGl5In0.6Vb11S6tdX6Arpj6trRE_g'),

  HACK_LOGIN_CALLBACK_HOST: z.string().default('612.connect-d5y.pages.dev'),
  HACK_DEFAULT_REDICT_HOST: z.string().default('comma.asius.ai'),

  EXAMPLE_ROUTE_NAME: z.string().default('a2a0ccea32023010/2023-07-27--13-01-19'),

  USER_CONTENT_DIR: z.string().default('user-content'),

  GOOGLE_CLIENT_ID: z.string().default('45471411055-ornt4svd2miog6dnopve7qtmh5mnu6id.apps.googleusercontent.com'),
  APPLE_CLIENT_ID: z.string().default('ai.comma.login'),
  GITHUB_CLIENT_ID: z.string().default('28c4ecb54bb7272cb5a4'),
  FORK: z.string().default('asius/sunnypilot'),
})

const fullEnv = typeof process !== 'undefined' ? process.env : import.meta.env
export const env = Environment.parse(Object.fromEntries(Object.entries(fullEnv).map(([k, v]) => [k.replace('VITE_', ''), v])))

const MODES = {
  comma: {
    name: 'comma connect',
    favicon: '/comma-favicon.svg',
    domain: 'comma.asius.ai',
    api: 'api.comma.ai',
  },
  konik: {
    name: 'konik connect',
    favicon: '/konik-favicon.svg',
    domain: 'konik.asius.ai',
    api: 'api.konik.ai',
  },
  asius: {
    name: 'asius connect',
    favicon: '/asius-favicon.svg',
    domain: 'connect.asius.ai',
    api: 'api.konik.ai',
  },
  dev: {
    name: 'asius connect',
    favicon: '/asius-favicon.svg',
    domain: 'connect.asius.ai',
    api: 'api.konik.ai',
  },
}

export const mode = MODES[env.MODE]
