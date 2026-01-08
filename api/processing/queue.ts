import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { uploadQueueTable } from '../db/schema'
import { env } from '../env'

const workers: Worker[] = []

export const queueFile = async (key: string): Promise<void> => {
  await db.insert(uploadQueueTable).values({ key }).onConflictDoNothing()
}

export const startQueueWorker = () => {
  if (workers.length > 0) return

  for (let i = 0; i < env.WORKER_COUNT; i++) {
    const worker = new Worker(new URL('./worker.ts', import.meta.url).href)
    worker.onmessage = (e) => {
      const { type, key, error } = e.data
      if (type === 'started') console.log(`Processing worker ${i + 1} started`)
      else if (type === 'processed') console.log(`Processed: ${key}`)
      else if (type === 'error') console.error(`Failed to process ${key}: ${error}`)
    }
    worker.onerror = (err) => console.error(`Worker ${i + 1} error:`, err)
    workers.push(worker)
  }

  console.log(`Started ${env.WORKER_COUNT} processing workers`)
}

export const stopQueueWorker = () => {
  for (const worker of workers) worker.terminate()
  workers.length = 0
}

export const getQueueStats = async () => {
  const uploaded = await db.select().from(uploadQueueTable).where(eq(uploadQueueTable.status, 'uploaded'))
  const processing = await db.select().from(uploadQueueTable).where(eq(uploadQueueTable.status, 'processing'))
  const done = await db.select().from(uploadQueueTable).where(eq(uploadQueueTable.status, 'done'))
  const error = await db.select().from(uploadQueueTable).where(eq(uploadQueueTable.status, 'error'))

  return {
    uploaded: uploaded.length,
    processing: processing.length,
    done: done.length,
    error: error.length,
  }
}
