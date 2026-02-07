import { z } from 'zod'
import { Env } from '../shared/env'

const zArray = () =>
  z
    .string()
    .or(z.string().array())
    .transform((x) => (typeof x === 'string' ? x.split(',') : x))

export const Environment = Env.extend({
  STORAGEBOX_URL: z.string().optional(),
  STORAGE_PATH: z.string().default('/tmp/asius'),

  DB_PATH: z.string().default('/tmp/asius.db'),

  JWT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),

  WORKER_COUNT: z.coerce.number().default(2),
  WORKER_POLL_INTERVAL: z.coerce.number().default(5000),

  SUPERUSERS: zArray().default([]),

  GITHUB_TOKEN: z.string().optional(),

  // R2 backup (optional)
  R2_BUCKET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
})

export const env = Environment.parse(process.env)
