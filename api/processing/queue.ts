import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { filesTable } from '../db/schema'
import { env } from '../env'

const workers: Worker[] = []

export const queueFile = async (key: string, size: number): Promise<void> => {
  const parts = key.split('/')
  const dongle_id = parts[0]
  const file = parts[parts.length - 1]

  // Check if this is a route file (dongleId/routeId/segment/file)
  let route_id: string | undefined
  let segment: number | undefined
  if (parts.length >= 4) {
    const segmentNum = parseInt(parts[2], 10)
    if (!Number.isNaN(segmentNum)) {
      route_id = parts[1]
      segment = segmentNum
    }
  }

  await db
    .insert(filesTable)
    .values({ key, dongle_id, route_id, segment, file, size })
    .onConflictDoUpdate({ target: filesTable.key, set: { size } })
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

export const deleteFile = async (key: string): Promise<void> => {
  await db.delete(filesTable).where(eq(filesTable.key, key))
}

export const getQueueStats = async () => {
  const queued = await db.select().from(filesTable).where(eq(filesTable.processingStatus, 'queued'))
  const processing = await db.select().from(filesTable).where(eq(filesTable.processingStatus, 'processing'))
  const done = await db.select().from(filesTable).where(eq(filesTable.processingStatus, 'done'))
  const error = await db.select().from(filesTable).where(eq(filesTable.processingStatus, 'error'))

  return {
    queued: queued.length,
    processing: processing.length,
    done: done.length,
    error: error.length,
  }
}
