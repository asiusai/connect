import { Server, Client, utils } from 'ssh2'
import { Duplex } from 'stream'

const SSH_PORT = Number(process.env.SSH_PORT) || 2222
const WS_PORT = Number(process.env.WS_PORT) || 8080
const HOST_KEY = process.env.SSH_HOST_KEY || utils.generateKeyPairSync('ed25519').private
const WS_ORIGIN = process.env.WS_ORIGIN || 'wss://ssh.asius.ai'
// Private key for browser SSH client auth - handle escaped newlines from env var
const BROWSER_SSH_KEY = process.env.BROWSER_SSH_KEY?.replace(/\\n/g, '\n')

// Athena URLs for each provider (must match connect/src/utils/providers.ts)
const ATHENA_URLS: Record<string, string> = {
  asius: 'https://api.asius.ai',
  comma: 'https://athena-comma-proxy.asius.ai',
  konik: 'https://api-konik-proxy.asius.ai/ws',
}

type Provider = 'asius' | 'comma' | 'konik'

type Session = {
  dongleId: string
  provider: Provider
  sshChannel?: any
  device?: any
  browser?: any
  sshClient?: Client
  shellStream?: any
  buffer: Buffer[]
}

const sessions = new Map<string, Session>()

// Parse username: "provider-dongleId-token" or "provider-dongleId"
// Provider is always required (asius, comma, konik)
const parseUsername = (username: string) => {
  const withToken = username.match(/^(comma|konik|asius)-([a-f0-9]+)-(.+)$/)
  if (withToken) return { provider: withToken[1] as Provider, dongleId: withToken[2], token: withToken[3] }

  const withProvider = username.match(/^(comma|konik|asius)-([a-f0-9]+)$/)
  if (withProvider) return { provider: withProvider[1] as Provider, dongleId: withProvider[2] }

  return null // Invalid format
}

const randomId = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

// Call athena to start local proxy on device
const callAthena = async (provider: Provider, dongleId: string, token: string | undefined, sessionId: string) => {
  const athenaUrl = ATHENA_URLS[provider]
  if (!athenaUrl) return { error: `Unknown provider: ${provider}` }

  if (!token) return { error: `Token required. Use: ssh ${provider}-${dongleId}-YOUR_TOKEN` }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `JWT ${token}`,
  }

  try {
    const res = await fetch(`${athenaUrl}/${dongleId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method: 'startLocalProxy',
        params: { remote_ws_uri: `${WS_ORIGIN}/ssh/${sessionId}`, local_port: 22 },
        id: 0,
        jsonrpc: '2.0',
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return { error: `HTTP ${res.status}: ${res.statusText}` }

    const data = await res.json()
    if (data.error) return { error: data.error.message || 'Device error' }
    return {}
  } catch (e: any) {
    return { error: e.message || 'Connection failed' }
  }
}

// Clean stale sessions
setInterval(() => {
  for (const [id, session] of sessions) {
    if (!session.device && !session.sshChannel && !session.browser) sessions.delete(id)
  }
}, 30000)

// SSH Server
const sshServer = new Server({ hostKeys: [HOST_KEY] }, (client) => {
  let provider: Provider
  let dongleId = ''
  let token: string | undefined

  client.on('authentication', (ctx) => {
    const parsed = parseUsername(ctx.username)
    if (!parsed) {
      ctx.reject(['publickey'])
      return
    }

    provider = parsed.provider
    dongleId = parsed.dongleId
    token = parsed.token

    if (ctx.method === 'publickey') ctx.accept()
    else ctx.reject(['publickey'])
  })

  client.on('ready', () => {
    console.log(`[${provider}/${dongleId}] authenticated`)

    // Handle direct-tcpip requests (ssh -W or ProxyJump)
    client.on('tcpip' as any, (accept: any, _reject: any, info: any) => {
      console.log(`[${provider}/${dongleId}] direct-tcpip to ${info.destIP}:${info.destPort}`)
      const channel = accept?.()
      if (!channel) return

      const sessionId = randomId()
      const session: Session = { dongleId, provider, sshChannel: channel, buffer: [] }
      sessions.set(sessionId, session)

      // Relay data from SSH channel to device
      channel.on('data', (data: Buffer) => {
        if (session.device) {
          session.device.send(data)
        } else {
          session.buffer.push(data)
        }
      })

      channel.on('close', () => {
        console.log(`[${provider}/${dongleId}] channel closed`)
        session.device?.close()
        sessions.delete(sessionId)
      })

      // Call athena to start local proxy
      callAthena(provider, dongleId, token, sessionId)
        .then((res) => {
          if (res.error) {
            console.error(`[${provider}/${dongleId}] ${res.error}`)
            channel.close()
            sessions.delete(sessionId)
          } else {
            console.log(`[${provider}/${dongleId}] waiting for device...`)
          }
        })
        .catch((err) => {
          console.error(`[${provider}/${dongleId}] athena error:`, err)
          channel.close()
          sessions.delete(sessionId)
        })
    })

    // Handle session requests (for info/help)
    client.on('session', (accept) => {
      const channel = accept()

      channel.on('pty', (accept) => accept?.())
      channel.on('shell', (accept) => {
        const stream = accept?.()
        stream?.write(`SSH Proxy for ${provider}-${dongleId}\r\n`)
        stream?.write(`\r\nUse ProxyJump to connect:\r\n`)
        stream?.write(`  ssh -J ${provider}-${dongleId}@ssh.asius.ai:2222 comma@localhost\r\n\r\n`)
        stream?.write(`Or add to ~/.ssh/config:\r\n`)
        stream?.write(`  Host ${dongleId}\r\n`)
        stream?.write(`    HostName localhost\r\n`)
        stream?.write(`    User comma\r\n`)
        stream?.write(`    ProxyJump ${provider}-${dongleId}@ssh.asius.ai:2222\r\n\r\n`)
        stream?.exit(0)
        stream?.close()
      })
      channel.on('exec', (accept) => {
        const stream = accept?.()
        stream?.write(`Use: ssh -J ${provider}-${dongleId}@ssh.asius.ai:2222 comma@localhost\r\n`)
        stream?.exit(0)
        stream?.close()
      })
    })
  })

  client.on('error', (err) => console.error('SSH error:', err.message))
})

sshServer.listen(SSH_PORT, '0.0.0.0', () => {
  console.log(`SSH server on port ${SSH_PORT}`)
})

type WsData = {
  sessionId: string
  type: 'device' | 'browser'
  provider?: Provider
  dongleId?: string
  token?: string
}

// WebSocket server for device and browser connections
Bun.serve<WsData>({
  port: WS_PORT,
  fetch: (req, server) => {
    const url = new URL(req.url)

    // Health check
    if (url.pathname === '/') return Response.redirect('https://asius.ai/docs/ssh', 301)
    if (url.pathname === '/health') {
      return new Response('ok')
    }

    // Device WebSocket: /ssh/{sessionId}
    if (url.pathname.startsWith('/ssh/')) {
      const sessionId = url.pathname.slice(5)
      const session = sessions.get(sessionId)

      if (!session) {
        return new Response('Session not found', { status: 404 })
      }

      if (server.upgrade(req, { data: { sessionId, type: 'device' } })) {
        return undefined
      }
      return new Response('Upgrade failed', { status: 400 })
    }

    // Browser WebSocket: /browser/{provider}-{dongleId}-{token} or /browser/{provider}-{dongleId}
    if (url.pathname.startsWith('/browser/')) {
      const username = url.pathname.slice(9)
      const parsed = parseUsername(username)

      if (!parsed) {
        return new Response('Invalid format. Use: /browser/provider-dongleId[-token]', { status: 400 })
      }

      const sessionId = randomId()
      const session: Session = {
        dongleId: parsed.dongleId,
        provider: parsed.provider,
        buffer: [],
      }
      sessions.set(sessionId, session)

      if (server.upgrade(req, { data: { sessionId, type: 'browser', ...parsed } })) {
        return undefined
      }

      sessions.delete(sessionId)
      return new Response('Upgrade failed', { status: 400 })
    }

    return new Response('Not found', { status: 404 })
  },
  websocket: {
    open(ws: any) {
      const { sessionId, type, provider, dongleId, token } = ws.data
      const session = sessions.get(sessionId)
      if (!session) return ws.close()

      if (type === 'browser') {
        session.browser = ws
        console.log(`[${provider}/${dongleId}] browser connected`)

        // Call athena to start local proxy on device
        callAthena(provider, dongleId, token, sessionId)
          .then((res) => {
            if (res.error) {
              console.error(`[${provider}/${dongleId}] ${res.error}`)
              ws.send(`\r\n\x1b[31mError: ${res.error}\x1b[0m\r\n`)
              ws.close()
              sessions.delete(sessionId)
            } else {
              console.log(`[${provider}/${dongleId}] waiting for device...`)
              ws.send(`\r\n\x1b[33mConnecting to device...\x1b[0m\r\n`)
            }
          })
          .catch((err) => {
            console.error(`[${provider}/${dongleId}] athena error:`, err)
            ws.send(`\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`)
            ws.close()
            sessions.delete(sessionId)
          })
      } else {
        // Device connection
        session.device = ws
        console.log(`[${session.provider}/${session.dongleId}] device connected`)

        // If browser is connected, set up SSH client to handle protocol
        if (session.browser) {
          session.browser.send(`\x1b[33mDevice connected, authenticating...\x1b[0m\r\n`)

          // Create a duplex stream that bridges WebSocket and SSH client
          // Buffer writes and send as complete packets using setImmediate
          let writeBuffer: Buffer[] = []
          let flushScheduled = false
          const flushBuffer = () => {
            if (writeBuffer.length > 0) {
              ws.send(Buffer.concat(writeBuffer))
              writeBuffer = []
            }
            flushScheduled = false
          }
          const wsStream = new Duplex({
            read() {},
            write(chunk, _encoding, callback) {
              writeBuffer.push(chunk)
              if (!flushScheduled) {
                flushScheduled = true
                setImmediate(flushBuffer)
              }
              callback()
            },
          })

          // Forward device data to the stream
          session.device._wsStream = wsStream

          const sshClient = new Client()
          session.sshClient = sshClient

          sshClient.on('ready', () => {
            console.log(`[${session.provider}/${session.dongleId}] SSH authenticated`)
            session.browser?.send(`\x1b[32mAuthenticated!\x1b[0m\r\n\r\n`)

            sshClient.shell({ term: 'xterm-256color' }, (err, stream) => {
              if (err) {
                session.browser?.send(`\x1b[31mShell error: ${err.message}\x1b[0m\r\n`)
                session.browser?.close()
                return
              }

              session.shellStream = stream

              // Send buffered input from browser
              for (const data of session.buffer) stream.write(data)
              session.buffer = []

              // Shell -> Browser
              stream.on('data', (data: Buffer) => {
                session.browser?.send(data)
              })

              stream.on('close', () => {
                console.log(`[${session.provider}/${session.dongleId}] shell closed`)
                session.browser?.close()
              })
            })
          })

          sshClient.on('error', (err) => {
            console.error(`[${session.provider}/${session.dongleId}] SSH error:`, err.message)
            session.browser?.send(`\x1b[31mSSH error: ${err.message}\x1b[0m\r\n`)
            session.browser?.close()
          })

          sshClient.on('keyboard-interactive', (_name, _instructions, _lang, _prompts, finish) => finish([]))

          if (!BROWSER_SSH_KEY) {
            session.browser?.send(`\x1b[31mBrowser SSH not configured\x1b[0m\r\n`)
            session.browser?.close()
            return
          }

          sshClient.connect({
            sock: wsStream,
            username: 'comma',
            privateKey: BROWSER_SSH_KEY,
            hostVerifier: () => true,
            readyTimeout: 60000,
          })
        } else {
          // No browser, just relay to SSH channel (original behavior)
          for (const data of session.buffer) ws.send(data)
          session.buffer = []
        }
      }
    },
    message(ws: any, msg: Buffer | string) {
      const { sessionId, type } = ws.data
      const session = sessions.get(sessionId)
      if (!session) return

      const data = typeof msg === 'string' ? Buffer.from(msg) : msg

      if (type === 'browser') {
        if (session.shellStream) {
          session.shellStream.write(data)
        } else {
          session.buffer.push(data)
        }
      } else {
        if (session.device?._wsStream) {
          session.device._wsStream.push(data)
        } else if (session.sshChannel) {
          session.sshChannel.write(data)
        }
      }
    },
    close(ws: any) {
      const { sessionId, type } = ws.data
      const session = sessions.get(sessionId)
      if (!session) return

      if (type === 'browser') {
        console.log(`[${session.provider}/${session.dongleId}] browser disconnected`)
        session.shellStream?.close()
        session.sshClient?.end()
        session.device?.close()
      } else {
        console.log(`[${session.provider}/${session.dongleId}] device disconnected`)
        session.shellStream?.close()
        session.sshClient?.end()
        session.browser?.close()
        session.sshChannel?.close()
      }
      sessions.delete(sessionId)
    },
  },
})

console.log(`WebSocket server on port ${WS_PORT}`)
