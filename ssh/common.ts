import { z } from 'zod'
import { PROVIDERS } from '../shared/provider'
import { decryptToken } from '../shared/encryption'

export const SSH_PORT = Number(process.env.SSH_PORT) || 2222
export const INTERNAL_HOST = '127.0.0.1'
export const WS_PORT = Number(process.env.WS_PORT) || 8080
export const WS_ORIGIN = process.env.WS_ORIGIN || 'wss://ssh.asius.ai'
export const MAX_BUFFER_SIZE = 1024 * 1024
export const HIGH_WATER_MARK = 64 * 1024

export const SSH_PRIVATE_KEY = process.env.SSH_PRIVATE_KEY?.replace(/\\n/g, '\n') as string
if (!SSH_PRIVATE_KEY) throw new Error('No SSH_PRIVATE_KEY')

export const ENCRYPTION_PRIVATE_KEY = process.env.ENCRYPTION_PRIVATE_KEY!
if (!ENCRYPTION_PRIVATE_KEY) throw new Error('No ENCRYPTION_PRIVATE_KEY')

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

export const parseUsername = (username: string): Auth | undefined => {
  const [provider, dongleId, ...rest] = username.split('-')
  const tokenPart = rest.join('-')
  if (!dongleId || !tokenPart) return undefined

  const res = Provider.safeParse(provider)
  if (!res.success) return undefined

  const token = tokenPart.startsWith('enc.') ? decryptToken(tokenPart, ENCRYPTION_PRIVATE_KEY) : tokenPart
  if (!token) return undefined

  return { provider: res.data, dongleId, token }
}

export const randomId = () => crypto.randomUUID()

const callAthenaRpc = async <T>(auth: Auth, method: string, params: Record<string, unknown> = {}): Promise<T | undefined> => {
  const athenaUrl = PROVIDERS[auth.provider].ATHENA_URL
  if (!athenaUrl) return undefined

  try {
    const res = await fetch(`${athenaUrl}/${auth.dongleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${auth.token}` },
      body: JSON.stringify({ method, params, id: 0, jsonrpc: '2.0' }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return undefined
    const data = await res.json()
    if (data.error) return undefined
    return data.result as T
  } catch {
    return undefined
  }
}

export const startLocalProxy = async (auth: Auth, sessionId: string) => {
  const result = await callAthenaRpc<{ success: number }>(auth, 'startLocalProxy', {
    remote_ws_uri: `${WS_ORIGIN}/ssh/${sessionId}`,
    local_port: 22,
  })
  return result !== undefined
}

export const getAuthorizedKeys = async (auth: Auth): Promise<string[]> => {
  const result = await callAthenaRpc<string>(auth, 'getSshAuthorizedKeys')
  if (!result) return []
  return result.trim().split('\n').filter(Boolean)
}

const parseOpenSSHKey = (keyLine: string) => {
  const parts = keyLine.trim().split(' ')
  if (parts.length < 2) return undefined
  return { algo: parts[0], data: Buffer.from(parts[1], 'base64') }
}

export const keysMatch = (key: { algo: string; data: Buffer }, authorizedKeys: string[]) => {
  for (const keyLine of authorizedKeys) {
    const parsed = parseOpenSSHKey(keyLine)
    if (parsed && parsed.algo === key.algo && parsed.data.equals(key.data)) return true
  }
  return false
}
