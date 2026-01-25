import { Server, Channel } from 'ssh2'
import {
  Auth,
  getAuthorizedKeys,
  HIGH_WATER_MARK,
  keysMatch,
  SSH_PRIVATE_KEY,
  MAX_BUFFER_SIZE,
  parseUsername,
  randomId,
  startLocalProxy,
  WsData,
} from './common'

type WS = Bun.ServerWebSocket<WsData>

type Session = {
  id: string
  auth: Auth
  sshChannel: Channel
  device?: WS
  buffer: Buffer[]
  bufferSize: number
  paused: boolean
}

const sessions = new Map<string, Session>()

setInterval(() => {
  for (const [id, session] of sessions) {
    if (!session.device && session.sshChannel.destroyed) sessions.delete(id)
  }
}, 30000)

export const start = (req: Request, server: Bun.Server<WsData>) => {
  const sessionId = new URL(req.url).pathname.slice(5)
  const session = sessions.get(sessionId)
  if (!session) return new Response(`Session ${sessionId} not found`, { status: 404 })

  if (server.upgrade(req, { data: { sessionId, type: 'device' } })) return undefined
  return new Response('Upgrade failed', { status: 400 })
}

export const open = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return

  session.device = ws
  for (const data of session.buffer) session.device.send(data)
  session.buffer = []
}

export const message = (ws: WS, data: Buffer) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session?.device) return

  if (session.paused && session.sshChannel) {
    const buffered = session.device.getBufferedAmount?.() ?? 0
    if (buffered < HIGH_WATER_MARK / 2) {
      session.paused = false
      session.sshChannel.resume()
    }
  }

  session.sshChannel?.write(data)
}

export const close = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return
  session.sshChannel?.close()
  sessions.delete(session.id)
}

export const drain = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return
  session.paused = false
  session.sshChannel?.resume()
}

export const server = new Server({ hostKeys: [SSH_PRIVATE_KEY] }, (client) => {
  let auth: Auth

  client.on('authentication', async (ctx) => {
    const parsed = parseUsername(ctx.username)
    if (!parsed) return ctx.reject(['publickey'])
    auth = parsed

    if (ctx.method !== 'publickey') return ctx.reject(['publickey'])

    const authorizedKeys = await getAuthorizedKeys(auth)
    if (!authorizedKeys || authorizedKeys?.length === 0) return ctx.reject(['publickey'])
    else if (!keysMatch(ctx.key, authorizedKeys)) return ctx.reject(['publickey'])

    ctx.accept()
  })

  client.on('ready', () => {
    client.on('tcpip', async (accept) => {
      const channel = accept?.()
      if (!channel) return

      const sessionId = randomId()
      const session: Session = { id: sessionId, auth, sshChannel: channel, buffer: [], bufferSize: 0, paused: false }
      sessions.set(sessionId, session)

      channel.on('data', (data: Buffer) => {
        if (session.device) {
          const buffered = session.device.getBufferedAmount?.() ?? 0
          if (buffered > HIGH_WATER_MARK && !session.paused) {
            session.paused = true
            channel.pause()
          }
          session.device.send(data)
        } else {
          if (session.bufferSize + data.length > MAX_BUFFER_SIZE) {
            channel.close()
            sessions.delete(sessionId)
            return
          }
          session.buffer.push(data)
          session.bufferSize += data.length
        }
      })

      channel.on('close', () => {
        session.device?.close()
        sessions.delete(sessionId)
      })

      const started = await startLocalProxy(auth, sessionId)
      if (!started) {
        channel.close()
        sessions.delete(sessionId)
      }
    })

    client.on('session', (accept) => {
      const channel = accept()
      channel.on('pty', (accept) => accept?.())
      channel.on('shell', (accept) => {
        const stream = accept?.()
        stream?.write(`SSH Proxy for ${auth.provider}-${auth.dongleId}\r\n\r\n`)
        stream?.write(`Use: ssh -J ${auth.provider}-${auth.dongleId}@ssh.asius.ai:2222 comma@localhost\r\n\r\n`)
        stream?.exit(0)
        stream?.close()
      })
      channel.on('exec', (accept) => {
        const stream = accept?.()
        stream?.write(`Use: ssh -J ${auth.provider}-${auth.dongleId}@ssh.asius.ai:2222 comma@localhost\r\n`)
        stream?.exit(0)
        stream?.close()
      })
    })
  })

  client.on('error', () => {})
})
