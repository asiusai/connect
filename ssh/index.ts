import { Server, utils } from 'ssh2'

const SSH_PORT = Number(process.env.SSH_PORT) || 2222
const WS_PORT = Number(process.env.WS_PORT) || 8080
const HOST_KEY = process.env.SSH_HOST_KEY || utils.generateKeyPairSync('ed25519').private
const API_KEY = process.env.API_KEY
const WS_ORIGIN = process.env.WS_ORIGIN || 'wss://ssh.asius.ai'

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
  sshChannel: any
  device?: any
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

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (provider === 'asius') {
    if (!API_KEY) return { error: 'SSH proxy not configured' }
    headers['X-SSH-API-Key'] = API_KEY
  } else {
    if (!token) return { error: `Token required. Use: ssh ${provider}-${dongleId}-YOUR_TOKEN` }
    headers.Authorization = `JWT ${token}`
  }

  try {
    const res = await fetch(`${athenaUrl}/${dongleId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        method: 'startLocalProxy',
        params: { remote_ws_uri: `${WS_ORIGIN}/ssh/${sessionId}`, local_port: 8022 },
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
    if (!session.device && !session.sshChannel) sessions.delete(id)
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

// WebSocket server for device connections
Bun.serve({
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

      if (server.upgrade(req, { data: { sessionId } })) {
        return undefined
      }
      return new Response('Upgrade failed', { status: 400 })
    }

    return new Response('Not found', { status: 404 })
  },
  websocket: {
    data: {} as { sessionId: string },
    open(ws: any) {
      const session = sessions.get(ws.data.sessionId)
      if (!session) return ws.close()

      session.device = ws
      console.log(`[${session.provider}/${session.dongleId}] device connected`)

      // Flush buffer
      for (const data of session.buffer) ws.send(data)
      session.buffer = []
    },
    message(ws: any, msg: Buffer | string) {
      const session = sessions.get(ws.data.sessionId)
      if (!session) return

      session.sshChannel.write(typeof msg === 'string' ? Buffer.from(msg) : msg)
    },
    close(ws: any) {
      const session = sessions.get(ws.data.sessionId)
      if (!session) return

      console.log(`[${session.provider}/${session.dongleId}] device disconnected`)
      session.sshChannel?.close()
      sessions.delete(ws.data.sessionId)
    },
  },
})

console.log(`WebSocket server on port ${WS_PORT}`)
