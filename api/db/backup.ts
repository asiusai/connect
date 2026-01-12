import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { env } from '../env'

const BACKUP_INTERVAL = 60 * 60 * 1000 // 1 hour

const runMigrations = () => {
  console.log('[backup] Running migrations...')
  const sqlite = new Database(env.DB_PATH)
  sqlite.run('PRAGMA journal_mode = WAL')

  // Check if this is an existing database with tables but no migration tracking
  const tables = sqlite.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  const hasTables = tables.some((t) => t.name !== '__drizzle_migrations' && !t.name.startsWith('sqlite_'))
  const hasMigrationTable = tables.some((t) => t.name === '__drizzle_migrations')

  if (hasTables && !hasMigrationTable) {
    console.log('[backup] Existing database without migration tracking, skipping migrations')
    sqlite.close()
    return
  }

  migrate(drizzle(sqlite), { migrationsFolder: './db/migrations' })
  sqlite.close()
  console.log('[backup] Migrations complete')
}

const getR2Client = () => {
  if (!env.R2_BUCKET || !env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  })
}

const getLatestBackupKey = async (client: S3Client) => {
  const res = await client.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET, Prefix: 'db/' }))
  if (!res.Contents?.length) return null
  const sorted = res.Contents.sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
  return sorted[0].Key ?? null
}

export const restoreFromR2 = async () => {
  if (existsSync(env.DB_PATH)) {
    console.log('[backup] Local database exists, skipping restore')
    runMigrations()
    return
  }

  const client = getR2Client()
  if (!client) {
    runMigrations()
    return
  }

  console.log('[backup] No local database, checking R2...')
  const latestKey = await getLatestBackupKey(client)
  if (!latestKey) {
    console.log('[backup] No backup in R2 (first run)')
    runMigrations()
    return
  }

  console.log(`[backup] Restoring from ${latestKey}...`)
  const res = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: latestKey }))
  const bytes = await res.Body?.transformToByteArray()
  if (!bytes) throw new Error('Failed to download backup')

  mkdirSync(dirname(env.DB_PATH), { recursive: true })
  await Bun.write(env.DB_PATH, bytes)
  console.log('[backup] Restored')
  runMigrations()
}

const uploadBackup = async (client: S3Client) => {
  const file = Bun.file(env.DB_PATH)
  if (!(await file.exists())) return

  const key = `db/${Date.now()}.db`
  console.log(`[backup] Uploading to ${key}...`)
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
    }),
  )
  console.log('[backup] Done')
}

export const startBackupSchedule = () => {
  const client = getR2Client()
  if (!client) return console.log('[backup] R2 not configured, backups disabled')

  console.log('[backup] Starting hourly backups')
  setTimeout(() => uploadBackup(client), 60 * 1000) // first backup after 1 min
  setInterval(() => uploadBackup(client), BACKUP_INTERVAL)
}

export const getLastBackupTime = async (): Promise<number | null> => {
  const client = getR2Client()
  if (!client) return null

  const latestKey = await getLatestBackupKey(client)
  if (!latestKey) return null

  // Key format is db/{timestamp}.db
  const match = latestKey.match(/db\/(\d+)\.db/)
  return match ? parseInt(match[1], 10) : null
}
