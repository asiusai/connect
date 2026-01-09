import { randomId } from './common'
import { sendToDevice } from './ws'

type SshSession = {
  dongleId: string
  createdAt: number
  client?: Bun.ServerWebSocket<SshSocketData>
  device?: Bun.ServerWebSocket<SshSocketData>
  clientBuffer: (string | Buffer)[]
  deviceBuffer: (string | Buffer)[]
  sshChannel?: any // SSH channel from ssh2 server (for SSH proxy mode)
}

export type SshSocketData = { sessionId: string; type: 'client' | 'device'; dongleId: string }

export const sessions = new Map<string, SshSession>()

// Clean stale sessions every 10s
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (!session.client && !session.device && now - session.createdAt > 60000) sessions.delete(id)
  }
}, 10000)

export const createSshSession = async (dongleId: string, origin: string): Promise<string> => {
  const sessionId = randomId()
  sessions.set(sessionId, { dongleId, createdAt: Date.now(), clientBuffer: [], deviceBuffer: [] })

  // Tell device to connect (fire and forget)
  const wsUrl = `${origin.replace('http', 'ws')}/ssh/${sessionId}`
  sendToDevice(dongleId, 'startLocalProxy', { remote_ws_uri: wsUrl, local_port: 8022 }, 15000).then(
    (res) => res.error && console.error(`SSH ${sessionId}: device error:`, res.error),
  )

  return sessionId
}

export const getSshSession = (sessionId: string) => sessions.get(sessionId)

export const handleSshOpen = (ws: Bun.ServerWebSocket<SshSocketData>) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return ws.close(4000, 'Session not found')
  if (session[ws.data.type]) return ws.close(4001, `${ws.data.type} already connected`)

  session[ws.data.type] = ws
  console.log(`SSH ${ws.data.sessionId}: ${ws.data.type} connected`)

  // If this is device connecting and we have an SSH channel (proxy mode), set up bridging
  if (ws.data.type === 'device' && session.sshChannel) {
    const channel = session.sshChannel
    // Forward buffered data from SSH channel to device
    for (const msg of session.clientBuffer) ws.send(msg)
    session.clientBuffer.length = 0

    // Forward SSH channel data to device WebSocket
    channel.on('data', (data: Buffer) => {
      if (session.device) session.device.send(data)
    })
    return
  }

  // Flush buffered messages from the other side
  const buffer = ws.data.type === 'client' ? session.deviceBuffer : session.clientBuffer
  for (const msg of buffer) ws.send(msg)
  buffer.length = 0
}

export const handleSshClose = (ws: Bun.ServerWebSocket<SshSocketData>) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return

  const other = ws.data.type === 'client' ? 'device' : 'client'
  session[ws.data.type] = undefined
  session[other]?.close(1000, `${ws.data.type} disconnected`)
  session.sshChannel?.close()

  if (!session.client && !session.device && !session.sshChannel) sessions.delete(ws.data.sessionId)
  console.log(`SSH ${ws.data.sessionId}: ${ws.data.type} disconnected`)
}

export const handleSshMessage = (ws: Bun.ServerWebSocket<SshSocketData>, msg: string | Buffer) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return

  // Device sending to SSH channel (proxy mode)
  if (ws.data.type === 'device' && session.sshChannel) {
    session.sshChannel.write(typeof msg === 'string' ? Buffer.from(msg) : msg)
    return
  }

  const target = ws.data.type === 'client' ? session.device : session.client
  if (target) {
    target.send(msg)
  } else {
    // Buffer messages until the other side connects
    const buffer = ws.data.type === 'client' ? session.clientBuffer : session.deviceBuffer
    buffer.push(msg)
  }
}
