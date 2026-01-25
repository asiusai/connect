import { Client } from 'ssh2'
import { Auth, HIGH_WATER_MARK, INTERNAL_HOST, MAX_BUFFER_SIZE, parseUsername, randomId, SSH_PORT, SSH_PRIVATE_KEY, WsData } from './common'

type WS = Bun.ServerWebSocket<WsData>

export type Session = {
  id: string
  auth: Auth
  browser?: Bun.ServerWebSocket<WsData>
  sshClient?: Client
  buffer: Buffer[]
  bufferSize: number
  paused: boolean
}
export const sessions = new Map<string, Session>()

export const start = (req: Request, server: Bun.Server<WsData>) => {
  const username = new URL(req.url).pathname.slice(9)

  const auth = parseUsername(username)
  if (!auth) return new Response('Invalid format. Use: /browser/provider-dongleId-token', { status: 400 })

  const sessionId = randomId()
  sessions.set(sessionId, {
    id: sessionId,
    auth,
    buffer: [],
    bufferSize: 0,
    paused: false,
  })

  if (server.upgrade(req, { data: { sessionId, type: 'browser' } })) return undefined

  sessions.delete(sessionId)
  return new Response('Upgrade failed', { status: 400 })
}

export const open = async (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')

  session.browser = ws

  const auth = session.auth
  console.log(`[${auth.provider}/${auth.dongleId}] browser connected`)

  const client = new Client()
  session.sshClient = client

  client.on('ready', () => {
    console.log(`[${auth.provider}/${auth.dongleId}] browser SSH ready, opening channel`)

    // Request a direct-tcpip channel (same as ProxyJump)
    client.forwardOut(INTERNAL_HOST, 0, 'localhost', 22, (err, channel) => {
      if (err) {
        session.browser?.send(`\x1b[31mError: ${err.message}\x1b[0m\r\n`)
        session.browser?.close()
        return
      }

      // Send buffered input
      for (const data of session.buffer) channel.write(data)
      session.buffer = []
      session.bufferSize = 0

      // Channel -> Browser with backpressure
      channel.on('data', (data: Buffer) => {
        if (!session.browser) return
        const bufferedAmount = session.browser.getBufferedAmount?.() ?? 0
        if (bufferedAmount > HIGH_WATER_MARK) {
          if (!session.paused) {
            session.paused = true
            channel.pause()
          }
        }
        session.browser.send(data)
      })

      channel.on('close', () => {
        console.log(`[${auth.provider}/${auth.dongleId}] browser channel closed`)
        session.browser?.close()
      })
    })
  })

  client.on('error', (err) => {
    console.error(`[${auth.provider}/${auth.dongleId}] browser SSH error:`, err.message)
    session.browser?.send(`\x1b[31mSSH error: ${err.message}\x1b[0m\r\n`)
    session.browser?.close()
  })

  // Connect to our own SSH server with the server's key
  const username = `${auth.provider}-${auth.dongleId}-${auth.token}`
  client.connect({
    host: INTERNAL_HOST,
    port: SSH_PORT,
    username,
    privateKey: SSH_PRIVATE_KEY,
  })
}

export const message = (ws: WS, data: Buffer) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')
  if (!session.browser) throw new Error('No browser')

  if (session.bufferSize + data.length > MAX_BUFFER_SIZE) {
    console.error(`[${session.auth.provider}/${session.auth.dongleId}] browser buffer overflow, closing`)
    session.browser.close()
    sessions.delete(session.id)
    return
  }
  session.buffer.push(data)
  session.bufferSize += data.length
}

export const close = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')
  console.log(`[${session.auth.provider}/${session.auth.dongleId}] browser disconnected`)
  session.sshClient?.end()
  sessions.delete(session.id)
}

export const drain = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')

  session.paused = false
}
