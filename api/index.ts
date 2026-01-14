import { restoreFromR2, startBackupSchedule } from './db/backup'
import type { WebSocketData } from './ws'
await restoreFromR2()

// need to import like this cause otherwise the database get's created on import
const { handler } = await import('./handler')
const { websocket } = await import('./ws')
const { startQueueWorker } = await import('./processing/queue')

const server = Bun.serve<WebSocketData>({
  port: Number(process.env.PORT) || 8080,
  hostname: '0.0.0.0',
  idleTimeout: 255,
  websocket,
  fetch: handler,
})

console.log(`Started server on http://${server.hostname}:${server.port}`)

startQueueWorker()
startBackupSchedule()
