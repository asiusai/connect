import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'
import { env } from '../env'

const sqlite = new Database(env.DB_PATH)
sqlite.run('PRAGMA journal_mode = WAL')
sqlite.run('PRAGMA busy_timeout = 5000')

export const db = drizzle(sqlite, { schema })
