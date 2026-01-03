import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { env } from '../env'

const client = createClient({
  url: env.DB_URL,
  authToken: env.DB_AUTH,
})

export const db = drizzle(client, { schema })
