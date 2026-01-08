import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { filesTable } from '../db/schema'
import { processFile } from './index'
import { env } from '../env'

declare const self: Worker

const claimAndProcess = async (): Promise<boolean> => {
  // Find a queued file and atomically claim it
  const item = await db.query.filesTable.findFirst({
    where: eq(filesTable.processingStatus, 'queued'),
  })
  if (!item) return false

  // Try to claim it (only update if still 'queued')
  const claimed = await db
    .update(filesTable)
    .set({ processingStatus: 'processing' })
    .where(and(eq(filesTable.key, item.key), eq(filesTable.processingStatus, 'queued')))
    .returning()

  if (claimed.length === 0) return true // Someone else claimed it, try again

  const key = item.key
  const [dongleId, ...pathParts] = key.split('/')
  const path = pathParts.join('/')

  try {
    await processFile(dongleId, path)
    await db.update(filesTable).set({ processingStatus: 'done' }).where(eq(filesTable.key, key))
    self.postMessage({ type: 'processed', key })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await db.update(filesTable).set({ processingStatus: 'error', processingError: error }).where(eq(filesTable.key, key))
    self.postMessage({ type: 'error', key, error })
  }

  return true
}

const loop = async () => {
  while (true) {
    try {
      const hadWork = await claimAndProcess()
      if (!hadWork) await new Promise((r) => setTimeout(r, env.WORKER_POLL_INTERVAL))
    } catch (err) {
      console.error('Worker error:', err)
      await new Promise((r) => setTimeout(r, env.WORKER_POLL_INTERVAL))
    }
  }
}

self.postMessage({ type: 'started' })
loop()
