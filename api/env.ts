import { z } from 'zod'

const zString = (def?: string) => (def ? z.string().default(def) : z.string())
const zNumber = (def?: string) => (def ? z.string().default(def) : z.string()).transform((x) => Number(x))
const zArray = (def?: string) => (def ? z.string().default(def) : z.string()).transform((x) => x.split(','))

export const Environment = z.object({
  API_URL: zString('http://localhost:8080'),
  MKV_PORT: zNumber('5100'),
  MKV_VOLUMES: zArray('/tmp/mkv0,/tmp/mkv1'),
  MKV_DB: zString('/tmp/mkvdb'),

  DB_URL: zString('file:///tmp/data.db'),
  DB_AUTH: zString().optional(),
})

export const env = Environment.parse(process.env)
