import { randomId } from './common'
import { sendToDevice } from './ws'

export type SshWebSocketData = {
  sessionId: string
  type: 'client' | 'device'
  dongleId: string
}

type SshSession = {
  dongleId: string
  client?: Bun.ServerWebSocket<SshWebSocketData>
  device?: Bun.ServerWebSocket<SshWebSocketData>
  createdAt: number
}

const sessions = new Map<string, SshSession>()

// Clean up stale sessions (no connection after 60 seconds)
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (!session.client && !session.device && now - session.createdAt > 60000) {
      sessions.delete(id)
    }
  }
}, 10000)

export const createSshSession = (dongleId: string): string => {
  const sessionId = randomId()
  sessions.set(sessionId, {
    dongleId,
    createdAt: Date.now(),
  })
  return sessionId
}

export const getSshSession = (sessionId: string): SshSession | undefined => {
  return sessions.get(sessionId)
}

// Tell device to connect to SSH relay
export const notifyDeviceForSsh = async (dongleId: string, sessionId: string, origin: string) => {
  const wsUrl = `${origin.replace('http', 'ws')}/ssh/${sessionId}`

  const response = await sendToDevice(dongleId, 'startLocalProxy', {
    remote_ws_uri: wsUrl,
    local_port: 8022, // Device maps 8022 -> 22 for SSH
  }, 15000)

  return response
}

export const sshWebsocket: Bun.WebSocketHandler<SshWebSocketData> = {
  open: async (ws) => {
    const session = sessions.get(ws.data.sessionId)
    if (!session) {
      ws.close(4000, 'Session not found')
      return
    }

    if (ws.data.type === 'client') {
      if (session.client) {
        ws.close(4001, 'Client already connected')
        return
      }
      session.client = ws
      console.log(`SSH session ${ws.data.sessionId}: client connected for ${ws.data.dongleId}`)
    } else {
      if (session.device) {
        ws.close(4001, 'Device already connected')
        return
      }
      session.device = ws
      console.log(`SSH session ${ws.data.sessionId}: device connected`)
    }
  },

  close: (ws) => {
    const session = sessions.get(ws.data.sessionId)
    if (!session) return

    if (ws.data.type === 'client') {
      session.client = undefined
      // Close device connection when client disconnects
      if (session.device) {
        session.device.close(1000, 'Client disconnected')
      }
    } else {
      session.device = undefined
      // Close client connection when device disconnects
      if (session.client) {
        session.client.close(1000, 'Device disconnected')
      }
    }

    // Clean up session if both disconnected
    if (!session.client && !session.device) {
      sessions.delete(ws.data.sessionId)
    }

    console.log(`SSH session ${ws.data.sessionId}: ${ws.data.type} disconnected`)
  },

  message: (ws, msg) => {
    const session = sessions.get(ws.data.sessionId)
    if (!session) return

    // Relay message to the other end
    if (ws.data.type === 'client' && session.device) {
      session.device.send(msg)
    } else if (ws.data.type === 'device' && session.client) {
      session.client.send(msg)
    }
  },
}
