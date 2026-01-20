import { Client, utils, ServerChannel, ClientChannel } from 'ssh2'
import { Duplex } from 'stream'
import { z } from 'zod'
import { PROVIDERS } from '../connect/src/utils/env'

export const SSH_PORT = Number(process.env.SSH_PORT) || 2222
export const WS_PORT = Number(process.env.WS_PORT) || 8080
export const WS_ORIGIN = process.env.WS_ORIGIN || 'wss://ssh.asius.ai'
export const MAX_BUFFER_SIZE = 1024 * 1024
export const HIGH_WATER_MARK = 64 * 1024
export const SSH_PRIVATE_KEY = process.env.SSH_PRIVATE_KEY?.replace(/\\n/g, '\n') || utils.generateKeyPairSync('ed25519').private

export const Provider = z.enum(['asius', 'comma', 'konik'])
export type Provider = z.infer<typeof Provider>

export type Auth = {
  provider: Provider
  dongleId: string
  token: string
}

export type WsData = {
  type: 'browser' | 'device'
  sessionId: string
}

export type Session = {
  id: string
  auth: Auth
  sshChannel?: ServerChannel
  browser?: Bun.ServerWebSocket<WsData>
  device?: Bun.ServerWebSocket<WsData>
  sshClient?: Client
  shellStream?: ClientChannel
  buffer: Buffer[]
  bufferSize: number
  paused: boolean
  wsStream?: Duplex
}

export const parseUsername = (username: string): Auth | undefined => {
  const [provider, dongleId, token] = username.split('-')
  if (!dongleId || !token) return undefined

  const res = Provider.safeParse(provider)
  if (!res.success) return undefined

  return { provider: res.data, dongleId, token }
}

export const randomId = () => crypto.randomUUID()

export const sessions = new Map<string, Session>()

export const callAthena = async (auth: Auth, sessionId: string) => {
  const athenaUrl = PROVIDERS[auth.provider].ATHENA_URL
  if (!athenaUrl) return { error: `Unknown provider: ${auth.provider}` }

  try {
    const res = await fetch(`${athenaUrl}/${auth.dongleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${auth.token}` },
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
    return { error: e?.message || 'Connection failed' }
  }
}
