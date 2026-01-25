import { Client, ClientChannel } from 'ssh2'
import { Auth, HIGH_WATER_MARK, INTERNAL_HOST, MAX_BUFFER_SIZE, parseUsername, randomId, SSH_PORT, SSH_PRIVATE_KEY, WsData } from './common'

type WS = Bun.ServerWebSocket<WsData>

export type Session = {
  id: string
  auth: Auth
  browser?: Bun.ServerWebSocket<WsData>
  jumpClient?: Client
  deviceClient?: Client
  shell?: ClientChannel
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
  const log = (msg: string) => console.log(`[${auth.provider}/${auth.dongleId}] ${msg}`)
  log('browser connected')

  const jumpClient = new Client()
  session.jumpClient = jumpClient

  jumpClient.on('ready', () => {
    log('jump client ready, opening tunnel')

    // Request a direct-tcpip channel (TCP tunnel to device's SSH port)
    jumpClient.forwardOut(INTERNAL_HOST, 0, 'localhost', 22, (err, tunnel) => {
      if (err) {
        log(`forwardOut error: ${err.message}`)
        session.browser?.send(`\x1b[31mError: ${err.message}\x1b[0m\r\n`)
        session.browser?.close()
        return
      }

      log('tunnel established, connecting device client')

      // Create second SSH client that connects through the tunnel
      const deviceClient = new Client()
      session.deviceClient = deviceClient

      deviceClient.on('ready', () => {
        log('device client ready, requesting shell')

        deviceClient.shell({ term: 'xterm-256color' }, (err, shell) => {
          if (err) {
            log(`shell error: ${err.message}`)
            session.browser?.send(`\x1b[31mShell error: ${err.message}\x1b[0m\r\n`)
            session.browser?.close()
            return
          }

          log('shell established')
          session.shell = shell

          // Send buffered input
          for (const data of session.buffer) shell.write(data)
          session.buffer = []
          session.bufferSize = 0

          // Shell -> Browser with backpressure
          shell.on('data', (data: Buffer) => {
            if (!session.browser) return
            const bufferedAmount = session.browser.getBufferedAmount?.() ?? 0
            if (bufferedAmount > HIGH_WATER_MARK) {
              if (!session.paused) {
                session.paused = true
                shell.pause()
              }
            }
            session.browser.send(data)
          })

          shell.on('close', () => {
            log('shell closed')
            session.browser?.close()
          })
        })
      })

      deviceClient.on('error', (err) => {
        log(`device client error: ${err.message}`)
        session.browser?.send(`\x1b[31mDevice SSH error: ${err.message}\x1b[0m\r\n`)
        session.browser?.close()
      })

      // Debug: log all authentication attempts
      deviceClient.on('keyboard-interactive', (name, _instructions, _lang, prompts, finish) => {
        log(`keyboard-interactive: name=${name}, prompts=${JSON.stringify(prompts)}`)
        finish([]) // No password
      })

      // Connect through the tunnel using it as the socket
      // Device needs to have the server's public key in authorized_keys for this to work
      deviceClient.connect({
        sock: tunnel,
        username: 'comma',
        privateKey: SSH_PRIVATE_KEY,
        debug: (msg) => log(`ssh2 debug: ${msg}`),
      })
    })
  })

  jumpClient.on('error', (err) => {
    log(`jump client error: ${err.message}`)
    session.browser?.send(`\x1b[31mSSH error: ${err.message}\x1b[0m\r\n`)
    session.browser?.close()
  })

  // Connect to our own SSH server with the server's key
  const username = `${auth.provider}-${auth.dongleId}-${auth.token}`
  jumpClient.connect({
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

  // Write directly to shell if available
  if (session.shell) {
    session.shell.write(data)
    return
  }

  // Buffer until shell is ready
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
  session.shell?.close()
  session.deviceClient?.end()
  session.jumpClient?.end()
  sessions.delete(session.id)
}

export const drain = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) throw new Error('No session!')

  session.paused = false
  session.shell?.resume()
}
