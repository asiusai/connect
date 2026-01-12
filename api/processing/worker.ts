import { eq, and, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { filesTable } from '../db/schema'
import { processFile } from './index'
import { env } from '../env'

declare const self: Worker

const MAX_RETRIES = 3
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

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
  const retries = item.retries
  const [dongleId, ...pathParts] = key.split('/')
  const path = pathParts.join('/')

  try {
    await processFile(dongleId, path)
    await db.update(filesTable).set({ processingStatus: 'done' }).where(eq(filesTable.key, key))
    self.postMessage({ type: 'processed', key })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    const newRetries = retries + 1
    if (newRetries >= MAX_RETRIES) {
      await db.update(filesTable).set({ processingStatus: 'error', processingError: error, retries: newRetries }).where(eq(filesTable.key, key))
      self.postMessage({ type: 'error', key, error })
    } else {
      await db.update(filesTable).set({ processingStatus: 'queued', processingError: error, retries: newRetries }).where(eq(filesTable.key, key))
      self.postMessage({ type: 'retry', key, error, retries: newRetries })
    }
  }

  return true
}

const requeueStuckProcessing = async () => {
  const cutoff = Date.now() - PROCESSING_TIMEOUT_MS
  const stuck = await db
    .update(filesTable)
    .set({ processingStatus: 'queued', retries: sql`${filesTable.retries} + 1` })
    .where(and(eq(filesTable.processingStatus, 'processing'), lt(filesTable.updated_time, cutoff), lt(filesTable.retries, MAX_RETRIES)))
    .returning()

  for (const item of stuck) {
    self.postMessage({ type: 'requeued', key: item.key, retries: item.retries })
  }

  // Mark as error if max retries exceeded
  const failed = await db
    .update(filesTable)
    .set({ processingStatus: 'error', processingError: 'Processing timeout exceeded max retries', retries: sql`${filesTable.retries} + 1` })
    .where(and(eq(filesTable.processingStatus, 'processing'), lt(filesTable.updated_time, cutoff)))
    .returning()

  for (const item of failed) {
    self.postMessage({ type: 'error', key: item.key, error: 'Processing timeout exceeded max retries' })
  }
}

const loop = async () => {
  let lastStuckCheck = 0
  while (true) {
    try {
      // Check for stuck processing jobs every minute
      if (Date.now() - lastStuckCheck > 60_000) {
        await requeueStuckProcessing()
        lastStuckCheck = Date.now()
      }
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
