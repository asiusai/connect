import { z } from 'zod'

const zArray = () =>
  z
    .string()
    .or(z.string().array())
    .transform((x) => (typeof x === 'string' ? x.split(',') : x))

export const Env = z.object({
  MAPBOX_USERNAME: z.string().default('commaai'),
  MAPBOX_LIGHT_STYLE_ID: z.string().default('clcl7mnu2000214s2zgcdly6e'),
  MAPBOX_DARK_STYLE_ID: z.string().default('clcgvbi4f000q15t6o2s8gys3'),
  MAPBOX_TOKEN: z.string().default('pk.eyJ1IjoiY29tbWFhaSIsImEiOiJjangyYXV0c20wMGU2NDluMWR4amUydGl5In0.6Vb11S6tdX6Arpj6trRE_g'),
  FORK: zArray().default(['asiusai/openpilot', 'asiusai/sunnypilot']),

  SSH_USERNAME: z.string().default('ouasius'),
  ENCRYPTION_KEY: z.string().default('yYwKdXFxqgnX5riNMPJCJtnXpcPvqWXPtn9YoTUw+kM='),

  HACK_LOGIN_CALLBACK_HOST: z.string().default('612.connect-d5y.pages.dev'),

  EXAMPLE_ROUTE_NAME: z.string().default('a2a0ccea32023010/2023-07-27--13-01-19'),
})

const sysEnv = typeof process !== 'undefined' ? process.env : import.meta.env

export const env = Env.parse(Object.fromEntries(Object.entries(sysEnv).map(([k, v]) => [k.replace('VITE_', ''), v])))
