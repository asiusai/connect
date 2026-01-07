import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DB_URL || 'file:///tmp/data.db',
    authToken: process.env.DB_AUTH,
  },
})
