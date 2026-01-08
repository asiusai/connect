import { eq } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'
import { db } from '../db/client'
import { uploadQueueTable } from '../db/schema'
import { superuserMiddleware } from '../middleware'
import { getQueueStats } from '../processing'

export const admin = tsr.router(contract.admin, {
  queueStats: superuserMiddleware(async () => {
    const stats = await getQueueStats()
    return { status: 200, body: stats }
  }),
  queueErrors: superuserMiddleware(async () => {
    const errors = await db.select().from(uploadQueueTable).where(eq(uploadQueueTable.status, 'error'))
    return { status: 200, body: errors }
  }),
  requeue: superuserMiddleware(async ({ body }) => {
    await db.update(uploadQueueTable).set({ status: 'uploaded', error: null }).where(eq(uploadQueueTable.key, body.key))
    return { status: 200, body: { success: 1 } }
  }),
})
