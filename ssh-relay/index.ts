import { Server } from 'ssh2'
import { WebSocketServer, WebSocket } from 'ws'
import { readFileSync } from 'fs'

const HOST_KEY = readFileSync(process.env.HOST_KEY || './host_key')
const ATHENA_URL = process.env.ATHENA_URL || 'https://athena.new-connect.dev'
const WS_PORT = Number(process.env.WS_PORT) || 8080
const SSH_PORT = Number(process.env.SSH_PORT) || 22

type PendingConnection = {
  resolve: (ws: WebSocket) => void
  reject: (err: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const pending = new Map<string, PendingConnection>()

// WebSocket server for device connections
const wss = new WebSocketServer({ port: WS_PORT })

wss.on('connection', (ws, req) => {
  const sessionId = req.url?.slice(1) // /abc123 -> abc123
  if (!sessionId) {
    console.log('[ws] connection without session id')
    ws.close()
    return
  }

  const conn = pending.get(sessionId)
  if (!conn) {
    console.log(`[ws] unknown session: ${sessionId}`)
    ws.close()
    return
  }

  console.log(`[ws] device connected for session: ${sessionId}`)
  clearTimeout(conn.timeout)
  conn.resolve(ws)
})

console.log(`[ws] listening on :${WS_PORT}`)

// SSH server
const ssh = new Server({ hostKeys: [HOST_KEY] }, (client) => {
  let dongleId: string

  client.on('authentication', (ctx) => {
    // Username format: comma-{dongleid}
    if (!ctx.username.startsWith('comma-')) {
      console.log(`[ssh] rejected username: ${ctx.username}`)
      ctx.reject(['publickey'])
      return
    }

    dongleId = ctx.username.replace('comma-', '')
    console.log(`[ssh] auth for dongle: ${dongleId}`)

    // Device's SSH daemon validates authorized keys, not us
    // We just forward the connection - actual auth happens on device
    if (ctx.method === 'publickey') {
      ctx.accept()
    } else {
      ctx.reject(['publickey'])
    }
  })

  client.on('ready', () => {
    console.log(`[ssh] client ready: ${dongleId}`)
  })

  client.on('session', (accept) => {
    const session = accept()

    session.on('shell', async (accept) => {
      const stream = accept()
      const sessionId = crypto.randomUUID()

      console.log(`[ssh] shell requested, session: ${sessionId}`)

      try {
        // Wait for device to connect (with timeout)
        const deviceWs = await new Promise<WebSocket>((resolve, reject) => {
          const timeout = setTimeout(() => {
            pending.delete(sessionId)
            reject(new Error('Device connection timeout'))
          }, 30000)

          pending.set(sessionId, { resolve, reject, timeout })

          // Tell device to connect via Athena
          const wsUrl = `wss://${process.env.WS_HOST || 'ssh.new-connect.dev'}:${WS_PORT}/${sessionId}`
          console.log(`[athena] calling startLocalProxy for ${dongleId} -> ${wsUrl}`)

          fetch(`${ATHENA_URL}/${dongleId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'startLocalProxy',
              params: [wsUrl, 22],
              id: sessionId,
            }),
          }).catch((err) => {
            console.error(`[athena] request failed:`, err)
            clearTimeout(timeout)
            pending.delete(sessionId)
            reject(err)
          })
        })

        pending.delete(sessionId)
        console.log(`[bridge] starting for session: ${sessionId}`)

        // Bridge SSH <-> WebSocket
        stream.on('data', (data: Buffer) => {
          if (deviceWs.readyState === WebSocket.OPEN) {
            deviceWs.send(data)
          }
        })

        deviceWs.on('message', (data: Buffer) => {
          stream.write(data)
        })

        stream.on('close', () => {
          console.log(`[bridge] ssh stream closed: ${sessionId}`)
          deviceWs.close()
        })

        deviceWs.on('close', () => {
          console.log(`[bridge] websocket closed: ${sessionId}`)
          stream.end()
        })

        deviceWs.on('error', (err) => {
          console.error(`[bridge] websocket error: ${sessionId}`, err)
          stream.end()
        })

        stream.on('error', (err: Error) => {
          console.error(`[bridge] ssh error: ${sessionId}`, err)
          deviceWs.close()
        })
      } catch (err) {
        console.error(`[ssh] session error:`, err)
        stream.write(`\r\nError: ${err instanceof Error ? err.message : 'Unknown error'}\r\n`)
        stream.end()
      }
    })

    session.on('pty', (accept) => {
      accept()
    })
  })

  client.on('error', (err) => {
    console.error(`[ssh] client error:`, err)
  })

  client.on('end', () => {
    console.log(`[ssh] client disconnected: ${dongleId}`)
  })
})

ssh.listen(SSH_PORT, () => {
  console.log(`[ssh] listening on :${SSH_PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[shutdown] received SIGTERM')
  wss.close()
  ssh.close()
  process.exit(0)
})
