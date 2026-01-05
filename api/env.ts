import { z } from 'zod'

const zString = (def?: string) => (def ? z.string().default(def) : z.string())
const zNumber = (def?: string) => (def ? z.string().default(def) : z.string()).transform((x) => Number(x))
const zArray = (def?: string) => (def ? z.string().default(def) : z.string()).transform((x) => x.split(','))

export const Environment = z.object({
  JWT_SECRET: zString('sdfasjh43h5j3h4jhsadgfjharjhty345tsdfhjsjdhf'),
  MKV_PORT: zNumber('5100'),
  MKV_VOLUMES: zArray('/tmp/mkv0,/tmp/mkv1'),
  MKV_DB: zString('/tmp/mkvdb'),

  DB_URL: zString('file:///tmp/data.db'),
  DB_AUTH: zString().optional(),

  GOOGLE_CLIENT_ID: zString(),
  GOOGLE_CLIENT_SECRET: zString(),
})

export const env = Environment.parse(process.env)
