import { API_URL } from '../config'

const AUTH_KEY = 'ai.comma.api.authorization'

let initialized = false
let _accessToken: string | null = null

export const refreshAccessToken = async (code: string, provider: string) => {
  try {
    const resp = await fetch(`${API_URL}/v2/auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ code, provider }),
    })

    if (!resp.ok) throw new Error(`${resp.status}: ${await resp.text()}`)

    // TODO: validate response
    const json = (await resp.json()) as Record<string, string>
    if (!json.access_token) throw new Error('unknown error')

    setAccessToken(json.access_token)
  } catch (e) {
    throw new Error('Could not exchange oauth code for access token', { cause: e })
  }
}

export const accessToken = () => {
  if (typeof localStorage === 'undefined') return null
  if (!initialized) {
    initialized = true
    _accessToken = localStorage.getItem(AUTH_KEY)
  }
  return _accessToken
}

export function setAccessToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return
  _accessToken = token
  if (token === null) localStorage.removeItem(AUTH_KEY)
  else localStorage.setItem(AUTH_KEY, token)
}

export const isSignedIn = () => !!accessToken()

export const signOut = () => setAccessToken(null)
