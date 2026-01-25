import { Auth, HIGH_WATER_MARK, MAX_BUFFER_SIZE, parseUsername, randomId, WsData } from './common'
import { spawn, ChildProcess } from 'child_process'

type WS = Bun.ServerWebSocket<WsData>

const SSH_KEY_PATH = '/data/browser-ssh-key'

type Session = {
  id: string
  auth: Auth
  browser?: WS
  sshProcess?: ChildProcess
  buffer: Buffer[]
  bufferSize: number
  paused: boolean
}

const sessions = new Map<string, Session>()

export const start = (req: Request, server: Bun.Server<WsData>) => {
  const username = new URL(req.url).pathname.slice(9)
  const auth = parseUsername(username)
  if (!auth) return new Response('Invalid format. Use: /browser/provider-dongleId-token', { status: 400 })

  const sessionId = randomId()
  sessions.set(sessionId, { id: sessionId, auth, buffer: [], bufferSize: 0, paused: false })

  if (server.upgrade(req, { data: { sessionId, type: 'browser' } })) return undefined
  sessions.delete(sessionId)
  return new Response('Upgrade failed', { status: 400 })
}

export const open = async (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return
  session.browser = ws

  const { provider, dongleId, token } = session.auth
  const safePattern = /^[a-zA-Z0-9._-]+$/
  if (!safePattern.test(provider) || !safePattern.test(dongleId) || !safePattern.test(token)) {
    sessions.delete(session.id)
    session.browser?.send('\x1b[31mInvalid credentials\x1b[0m\r\n')
    session.browser?.close()
    return
  }

  const username = `${provider}-${dongleId}-${token}`
  const proxyCmd = `ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -W %h:%p ${username}@127.0.0.1 -p 2222`

  const sshProcess = spawn('ssh', [
    '-tt',
    '-i',
    SSH_KEY_PATH,
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'UserKnownHostsFile=/dev/null',
    '-o',
    `ProxyCommand=${proxyCmd}`,
    '-o',
    'ConnectTimeout=30',
    '-o',
    'ServerAliveInterval=15',
    '-o',
    'ServerAliveCountMax=3',
    '-o',
    'SetEnv=TERM=xterm-256color',
    'comma@localhost',
  ])
  session.sshProcess = sshProcess

  sshProcess.stdout?.on('data', (data: Buffer) => {
    if (!session.browser) return
    const buffered = session.browser.getBufferedAmount?.() ?? 0
    if (buffered > HIGH_WATER_MARK && !session.paused) {
      session.paused = true
      sshProcess.stdout?.pause()
    }
    session.browser.send(data)
  })

  sshProcess.on('close', () => {
    sessions.delete(session.id)
    session.browser?.close()
  })

  sshProcess.on('error', (err) => {
    session.browser?.send(`\x1b[31mSSH error: ${err.message}\x1b[0m\r\n`)
    sessions.delete(session.id)
    session.browser?.close()
  })

  for (const data of session.buffer) sshProcess.stdin?.write(data)
  session.buffer = []
  session.bufferSize = 0
}

export const message = (ws: WS, data: Buffer) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session?.browser) return

  if (session.sshProcess?.stdin) {
    session.sshProcess.stdin.write(data)
    return
  }

  if (session.bufferSize + data.length > MAX_BUFFER_SIZE) {
    session.browser.close()
    sessions.delete(session.id)
    return
  }
  session.buffer.push(data)
  session.bufferSize += data.length
}

export const close = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return
  session.sshProcess?.kill()
  sessions.delete(session.id)
}

export const drain = (ws: WS) => {
  const session = sessions.get(ws.data.sessionId)
  if (!session) return
  session.paused = false
  session.sshProcess?.stdout?.resume()
}
