import { parse } from '../shared/helpers'
import { randomId } from './common'
import { db } from './db/client'
import { athenaPingsTable, DeviceData, logsTable, statsTable, athenaQueueTable } from './db/schema'
import { eq, and, gt } from 'drizzle-orm'

export type WebSocketData = { dongleId: string; device: DeviceData }

type PendingRequest = { resolve: (value: any) => void; reject: (reason: any) => void; timeout: Timer }

const connections = new Map<string, Bun.ServerWebSocket<WebSocketData>>()
const pendingRequests = new Map<number, PendingRequest>()
let requestCounter = 0

// This is required for openpilot/sunnypilot to show "Connect online" status
setInterval(() => {
  for (const ws of connections.values()) ws.ping()
}, 30000)

const athenaPing = async (dongleId: string) => await db.insert(athenaPingsTable).values({ id: randomId(), dongle_id: dongleId })

export const sendToDevice = async (
  dongleId: string,
  method: string,
  params: any,
  timeout = 60_000,
): Promise<{ result?: any; error?: any; queued?: boolean }> => {
  const ws = connections.get(dongleId)

  if (!ws) {
    // Device offline - add to queue if method has expiry
    const expiry = params?.expiry ? params.expiry * 1000 : null
    if (expiry && expiry > Date.now()) {
      await db.insert(athenaQueueTable).values({
        id: randomId(),
        dongle_id: dongleId,
        method,
        params: JSON.stringify(params),
        expiry,
      })
      return { queued: true, result: 'Device offline, request queued' }
    }
    return { error: { code: -1, message: 'Device offline' } }
  }

  const requestId = ++requestCounter
  const request = { id: requestId, jsonrpc: '2.0', method, params }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId)
      resolve({ error: { code: -2, message: 'Request timeout' } })
    }, timeout)

    pendingRequests.set(requestId, { resolve, reject, timeout: timer })

    ws.send(JSON.stringify(request))
  })
}

const processOfflineQueue = async (ws: Bun.ServerWebSocket<WebSocketData>) => {
  const now = Date.now()
  const queuedRequests = await db.query.athenaQueueTable.findMany({
    where: and(eq(athenaQueueTable.dongle_id, ws.data.dongleId), gt(athenaQueueTable.expiry, now)),
  })

  for (const req of queuedRequests) {
    const request = { id: 0, jsonrpc: '2.0', method: req.method, params: JSON.parse(req.params) }
    ws.send(JSON.stringify(request))
    await db.delete(athenaQueueTable).where(eq(athenaQueueTable.id, req.id))
  }

  // Clean up expired requests
  await db.delete(athenaQueueTable).where(and(eq(athenaQueueTable.dongle_id, ws.data.dongleId)))
}

export const websocket: Bun.WebSocketHandler<WebSocketData> = {
  open: async (ws) => {
    await athenaPing(ws.data.dongleId)
    connections.set(ws.data.dongleId, ws)
    await processOfflineQueue(ws)
  },
  close: async (ws) => {
    await athenaPing(ws.data.dongleId)
    connections.delete(ws.data.dongleId)
  },
  message: async (ws, msg) => {
    await athenaPing(ws.data.dongleId)
    const message = typeof msg === 'string' ? parse<{ id?: number; method?: string; params?: any; result?: any; error?: any }>(msg) : undefined
    if (!message) return

    // Response from device
    if ('result' in message || 'error' in message) {
      const requestId = message.id
      if (requestId !== undefined && requestId !== 0) {
        const pending = pendingRequests.get(requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          pendingRequests.delete(requestId)
          pending.resolve({ result: message.result, error: message.error })
        }
      }
      return
    }

    // Request from device (storeStats, forwardLogs, etc.)
    if (message.method === 'storeStats') {
      await db.insert(statsTable).values({ dongle_id: ws.data.dongleId, id: randomId(), raw: message.params.stats })
      ws.send(JSON.stringify({ id: message.id, jsonrpc: '2.0', result: { success: true } }))
    } else if (message.method === 'forwardLogs') {
      await db.insert(logsTable).values({ dongle_id: ws.data.dongleId, id: randomId(), raw: message.params.logs })
      ws.send(JSON.stringify({ id: message.id, jsonrpc: '2.0', result: { success: true } }))
    } else {
      console.error(`WS unknown method ${ws.data.dongleId} ${message?.method}`)
    }
  },
}

export const getOfflineQueue = async (dongleId: string) => {
  const now = Date.now()
  const queuedRequests = await db.query.athenaQueueTable.findMany({
    where: and(eq(athenaQueueTable.dongle_id, dongleId), gt(athenaQueueTable.expiry, now)),
  })

  return queuedRequests.map((req) => ({
    id: 0 as const,
    jsonrpc: '2.0' as const,
    method: req.method,
    params: JSON.parse(req.params),
    expiry: req.expiry ? Math.floor(req.expiry / 1000) : undefined,
  }))
}
