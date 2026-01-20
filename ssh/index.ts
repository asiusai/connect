import { parseUsername, randomId, sessions, SSH_PORT, WS_PORT, WsData } from './common'
import * as browser from './browser'
import * as device from './device'

// Clean up sessions
setInterval(() => {
  for (const [id, session] of sessions) {
    if (!session.device && !session.sshChannel && !session.browser) sessions.delete(id)
  }
}, 30000)

device.server.listen(SSH_PORT, '0.0.0.0', () => console.log(`SSH server on port ${SSH_PORT}`))

Bun.serve<WsData>({
  port: WS_PORT,
  fetch: (req, server) => {
    const url = new URL(req.url)

    if (url.pathname === '/') return Response.redirect('https://asius.ai/docs/ssh', 301)
    if (url.pathname === '/health') return new Response('ok')

    // Device WebSocket: /ssh/{sessionId}
    if (url.pathname.startsWith('/ssh/')) {
      const sessionId = url.pathname.slice(5)
      const session = sessions.get(sessionId)

      if (!session) return new Response(`Session ${sessionId} not found`, { status: 404 })

      if (server.upgrade(req, { data: { sessionId, type: 'device' } })) return undefined
      return new Response('Upgrade failed', { status: 400 })
    }

    // Browser WebSocket: /browser/{provider}-{dongleId}-{token}
    if (url.pathname.startsWith('/browser/')) {
      const username = url.pathname.slice(9)

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

    return new Response('Not found', { status: 404 })
  },
  websocket: {
    open: async (ws) => {
      const session = sessions.get(ws.data.sessionId)
      if (!session) return ws.close()

      if (ws.data.type === 'browser') {
        session.browser = ws
        await browser.open(session)
      } else {
        session.device = ws
        device.open(session)
      }
    },
    message: (ws, msg) => {
      const { sessionId, type } = ws.data
      const session = sessions.get(sessionId)
      if (!session) return

      const data = typeof msg === 'string' ? Buffer.from(msg) : msg

      if (type === 'browser') browser.message(session, data)
      else device.message(session, data)
    },
    drain: (ws) => {
      const { sessionId, type } = ws.data
      const session = sessions.get(sessionId)
      if (!session || !session.paused) return

      session.paused = false
      if (type === 'browser' && session.shellStream) session.shellStream.resume()
      else if (type === 'device' && session.sshChannel) session.sshChannel.resume()
    },
    close: (ws) => {
      const { sessionId, type } = ws.data
      const session = sessions.get(sessionId)
      if (!session) return

      if (type === 'browser') browser.close(session)
      else device.close(session)
    },
  },
})

console.log(`WebSocket server on port ${WS_PORT}`)
