import type { RouteInfo, RouteShareSignature } from '~/types'
import { API_URL, AUTH_KEY } from './consts'

export const parseRouteName = (routeName: string): RouteInfo => {
  const [dongleId, routeId] = routeName.split('|')
  return { dongleId, routeId }
}

export const createQCameraStreamUrl = (routeName: string, signature: RouteShareSignature): string =>
  `${API_URL}/v1/route/${routeName.replace('/', '%7C')}/qcamera.m3u8?${new URLSearchParams(signature).toString()}`

export const getService = () => (typeof window !== 'undefined' ? window.location.host : 'localhost:3000')

let _accessToken: string | null = null
export const accessToken = () => {
  if (typeof localStorage === 'undefined') return null
  if (!_accessToken) _accessToken = localStorage.getItem(AUTH_KEY)
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
