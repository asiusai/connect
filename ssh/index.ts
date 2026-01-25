import { SSH_PORT, WS_PORT, WsData } from './common'
import * as browser from './browser'
import * as device from './device'

device.server.listen(SSH_PORT, '0.0.0.0', () => console.log(`SSH server on port ${SSH_PORT}`))

Bun.serve<WsData>({
  port: WS_PORT,
  fetch: (req, server) => {
    const url = new URL(req.url)

    if (url.pathname === '/') return Response.redirect('https://asius.ai/docs/ssh', 301)
    if (url.pathname === '/health') return new Response('ok')

    // Device WebSocket: /ssh/{sessionId}
    if (url.pathname.startsWith('/ssh/')) return device.start(req, server)

    // Browser WebSocket: /browser/{provider}-{dongleId}-{token}
    if (url.pathname.startsWith('/browser/')) return browser.start(req, server)

    return new Response('Not found', { status: 404 })
  },
  websocket: {
    open: async (ws) => {
      console.log(`[WS] open: type=${ws.data.type}, sessionId=${ws.data.sessionId}`)
      if (ws.data.type === 'device') device.open(ws)
      else browser.open(ws)
    },
    message: (ws, msg) => {
      const data = typeof msg === 'string' ? Buffer.from(msg) : Buffer.from(msg)
      console.log(`[WS] message: type=${ws.data.type}, sessionId=${ws.data.sessionId}, len=${data.length}`)

      if (ws.data.type === 'device') device.message(ws, data)
      else browser.message(ws, data)
    },
    drain: (ws) => {
      console.log(`[WS] drain: type=${ws.data.type}, sessionId=${ws.data.sessionId}`)
      if (ws.data.type === 'device') device.drain(ws)
      else browser.drain(ws)
    },
    close: (ws, code, reason) => {
      console.log(`[WS] close: type=${ws.data.type}, sessionId=${ws.data.sessionId}, code=${code}, reason=${reason}`)
      if (ws.data.type === 'device') device.close(ws)
      else browser.close(ws)
    },
  },
})

console.log(`WebSocket server on port ${WS_PORT}`)
