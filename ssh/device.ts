import { Server } from 'ssh2'
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
import { Channel } from 'ssh2'

type WS = Bun.ServerWebSocket<WsData>

export type Session = {
  id: string
  auth: Auth
  sshChannel: Channel
  device?: Bun.ServerWebSocket<WsData>
  buffer: Buffer[]
  bufferSize: number
  paused: boolean
}
export const sessions = new Map<string, Session>()

// Clean up sessions
setInterval(() => {
  for (const [id, session] of sessions) {
    if (!session.device && !session.sshChannel) sessions.delete(id)
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
  if (!session) throw new Error('No session!')

  session.device = ws

  console.log(`[${session.auth.provider}/${session.auth.dongleId}] device connected`)

  // Relay buffered data to device
  for (const data of session.buffer) session.device.send(data)
  session.buffer = []
}

export const message = (ws: WS, data: Buffer) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')
  if (!session.device) throw new Error('No device!')

  // Check if we should resume paused upstream
  if (session.paused && session.sshChannel) {
    const bufferedAmount = session.device.getBufferedAmount?.() ?? 0
    if (bufferedAmount < HIGH_WATER_MARK / 2) {
      session.paused = false
      session.sshChannel.resume()
    }
  }

  if (session.sshChannel) session.sshChannel.write(data)
}

export const close = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')

  console.log(`[${session.auth.provider}/${session.auth.dongleId}] device disconnected`)
  session.sshChannel?.close()
  sessions.delete(session.id)
}

export const server = new Server({ hostKeys: [SSH_PRIVATE_KEY] }, (client) => {
  let auth: Auth

  client.on('authentication', async (ctx) => {
    const parsed = parseUsername(ctx.username)
    if (!parsed) {
      ctx.reject(['publickey'])
      return
    }
    auth = parsed

    if (ctx.method !== 'publickey') {
      ctx.reject(['publickey'])
      return
    }

    const authorizedKeys = await getAuthorizedKeys(auth)
    if (authorizedKeys.length === 0) {
      console.log(`[${auth.provider}/${auth.dongleId}] no SSH keys configured on device`)
      ctx.reject(['publickey'])
      return
    }

    if (!keysMatch(ctx.key, authorizedKeys)) {
      console.log(`[${auth.provider}/${auth.dongleId}] SSH key not authorized`)
      ctx.reject(['publickey'])
      return
    }

    console.log(`[${auth.provider}/${auth.dongleId}] SSH key verified`)
    ctx.accept()
  })

  client.on('ready', () => {
    console.log(`[${auth.provider}/${auth.dongleId}] authenticated`)

    // Handle direct-tcpip requests (ssh -W or ProxyJump)
    client.on('tcpip', async (accept, _reject, info) => {
      console.log(`[${auth.provider}/${auth.dongleId}] direct-tcpip to ${info.destIP}:${info.destPort}`)
      const channel = accept?.()
      if (!channel) return

      const sessionId = randomId()
      const session: Session = { id: sessionId, auth, sshChannel: channel, buffer: [], bufferSize: 0, paused: false }
      sessions.set(sessionId, session)

      // Relay data from SSH channel to device with backpressure
      channel.on('data', (data: Buffer) => {
        if (session.device) {
          const bufferedAmount = session.device.getBufferedAmount?.() ?? 0
          if (bufferedAmount > HIGH_WATER_MARK) {
            if (!session.paused) {
              session.paused = true
              channel.pause()
            }
          }
          session.device.send(data)
        } else {
          if (session.bufferSize + data.length > MAX_BUFFER_SIZE) {
            console.error(`[${auth.provider}/${auth.dongleId}] buffer overflow, closing`)
            channel.close()
            sessions.delete(sessionId)
            return
          }
          session.buffer.push(data)
          session.bufferSize += data.length
        }
      })

      channel.on('close', () => {
        console.log(`[${auth.provider}/${auth.dongleId}] channel closed`)
        session.device?.close()
        sessions.delete(sessionId)
      })

      // Call athena to start local proxy
      const started = await startLocalProxy(auth, sessionId)
      if (!started) {
        console.error(`[${auth.provider}/${auth.dongleId}] failed to start local proxy`)
        channel.close()
        sessions.delete(sessionId)
        return
      }
      console.log(`[${auth.provider}/${auth.dongleId}] waiting for device...`)
    })

    // Handle session requests (for info/help)
    client.on('session', (accept) => {
      const channel = accept()

      channel.on('pty', (accept) => accept?.())
      channel.on('shell', (accept) => {
        const stream = accept?.()
        stream?.write(`SSH Proxy for ${auth.provider}-${auth.dongleId}\r\n`)
        stream?.write(`\r\nUse ProxyJump to connect:\r\n`)
        stream?.write(`  ssh -J ${auth.provider}-${auth.dongleId}@ssh.asius.ai:2222 comma@localhost\r\n\r\n`)
        stream?.write(`Or add to ~/.ssh/config:\r\n`)
        stream?.write(`  Host ${auth.dongleId}\r\n`)
        stream?.write(`    HostName localhost\r\n`)
        stream?.write(`    User comma\r\n`)
        stream?.write(`    ProxyJump ${auth.provider}-${auth.dongleId}@ssh.asius.ai:2222\r\n\r\n`)
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

  client.on('error', (err) => console.error('SSH error:', err.message))
})

export const drain = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')

  session.paused = false
  if (session.sshChannel) session.sshChannel.resume()
}
