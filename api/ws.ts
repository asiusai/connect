import { parse } from '../connect/src/utils/helpers'
import { randomId } from './common'
import { db } from './db/client'
import { athenaPingsTable, DeviceData, logsTable, statsTable } from './db/schema'

export type WebSocketData = { dongleId: string; device: DeviceData }

const athenaPing = async (dongleId: string) => await db.insert(athenaPingsTable).values({ id: randomId(), dongle_id: dongleId })

const connections = new Map<string, Bun.ServerWebSocket<WebSocketData>>()

export const websocket: Bun.WebSocketHandler<WebSocketData> = {
  open: async (ws) => {
    await athenaPing(ws.data.dongleId)
    connections.set(ws.data.dongleId, ws)
  },
  close: async (ws) => {
    await athenaPing(ws.data.dongleId)
    connections.delete(ws.data.dongleId)
  },
  message: async (ws, msg) => {
    await athenaPing(ws.data.dongleId)
    const message = typeof msg === 'string' ? parse<{ method: string; params: any }>(msg) : undefined
    if (!message) return
    if (message.method === 'storeStats') {
      await db.insert(statsTable).values({ dongle_id: ws.data.dongleId, id: randomId(), raw: message.params.stats })
    } else if (message.method === 'forwardLogs') {
      await db.insert(logsTable).values({ dongle_id: ws.data.dongleId, id: randomId(), raw: message.params.logs })
    } else console.error(`WS message ${ws.data.dongleId} ${message?.method}`)
  },
}
