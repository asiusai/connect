import { z } from 'zod'

const zString = (def?: string) => (def ? z.string().default(def) : z.string())

export const Environment = z.object({
  ATHENA_URL: zString('https://athena.new-connect.dev'), // Needed cause athena.comma.ai restricts CORS
  API_URL: zString('https://api.comma.ai'),
  AUTH_URL: zString('https://api.comma.ai'),
  BILLING_URL: zString('https://billing.new-connect.dev'), // Needed cause billing.comma.ai restricts CORS
  USERADMIN_URL: zString('https://useradmin.comma.ai'),
  RENDERER_URL: zString('https://renderer.new-connect.dev'),
  TEMPLATES_URL: zString('https://templates.new-connect.dev'),

  DEMO_DONGLE_ID: zString('1d3dc3e03047b0c7'),
  DEMO_ACCESS_TOKEN: zString(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjEwMzg5NTgwNzM1LCJuYmYiOjE3NDk1ODA3MzUsImlhdCI6MTc0OTU4MDczNSwiaWRlbnRpdHkiOiIwZGVjZGRjZmRmMjQxYTYwIn0.KsDzqJxgkYhAs4tCgrMJIdORyxO0CQNb0gHXIf8aUT0',
  ),

  MAPBOX_USERNAME: zString('commaai'),
  MAPBOX_LIGHT_STYLE_ID: zString('clcl7mnu2000214s2zgcdly6e'),
  MAPBOX_DARK_STYLE_ID: zString('clcgvbi4f000q15t6o2s8gys3'),
  MAPBOX_TOKEN: zString('pk.eyJ1IjoiY29tbWFhaSIsImEiOiJjangyYXV0c20wMGU2NDluMWR4amUydGl5In0.6Vb11S6tdX6Arpj6trRE_g'),

  SHARED_DEVICE: zString('Shared Device'),

  HACK_LOGIN_CALLBACK_HOST: zString('612.connect-d5y.pages.dev'),
  HACK_DEFAULT_REDICT_HOST: zString('new-connect.dev'),

  EXAMPLE_ROUTE_NAME: zString('a2a0ccea32023010/2023-07-27--13-01-19'),

  USER_CONTENT_DIR: zString('user-content'),

  GOOGLE_CLIENT_ID: zString('45471411055-ornt4svd2miog6dnopve7qtmh5mnu6id.apps.googleusercontent.com'),
  APPLE_CLIENT_ID: zString('ai.comma.login'),
  GITHUB_CLIENT_ID: zString('28c4ecb54bb7272cb5a4'),
})

const fullEnv = typeof process !== 'undefined' ? process.env : import.meta.env
export const env = Environment.parse(Object.fromEntries(Object.entries(fullEnv).map(([k, v]) => [k.replace('VITE_', ''), v])))
