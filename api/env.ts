import { z } from 'zod'

export const Environment = z.object({
  MKV_URL: z.string().default("http://localhost:3000"),

  DB_URL: z.string().default('file:///tmp/data.db'),
  DB_AUTH: z.string().optional(),

  JWT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
})

export const env = Environment.parse(process.env)
