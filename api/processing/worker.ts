import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { uploadQueueTable } from '../db/schema'
import { processFile } from './index'
import { env } from '../env'

declare const self: Worker

const claimAndProcess = async (): Promise<boolean> => {
  // Find an uploaded file and atomically claim it
  const item = await db.query.uploadQueueTable.findFirst({
    where: eq(uploadQueueTable.status, 'uploaded'),
  })
  if (!item) return false

  // Try to claim it (only update if still 'uploaded')
  const claimed = await db
    .update(uploadQueueTable)
    .set({ status: 'processing' })
    .where(and(eq(uploadQueueTable.key, item.key), eq(uploadQueueTable.status, 'uploaded')))
    .returning()

  if (claimed.length === 0) return true // Someone else claimed it, try again

  const key = item.key
  const [dongleId, ...pathParts] = key.split('/')
  const path = pathParts.join('/')

  try {
    await processFile(dongleId, path)
    await db.update(uploadQueueTable).set({ status: 'done' }).where(eq(uploadQueueTable.key, key))
    self.postMessage({ type: 'processed', key })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await db.update(uploadQueueTable).set({ status: 'error', error }).where(eq(uploadQueueTable.key, key))
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
