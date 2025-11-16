import type { RouteInfo, RouteShareSignature } from '../types'
import { API_URL } from './consts'

export const parseRouteName = (routeName: string): RouteInfo => {
  const [dongleId, routeId] = routeName.split('|')
  return { dongleId, routeId }
}

export const createQCameraStreamUrl = (routeName: string, signature: RouteShareSignature): string =>
  `${API_URL}/v1/route/${routeName.replace('/', '%7C')}/qcamera.m3u8?${new URLSearchParams(signature).toString()}`

export const getService = () => (typeof window !== 'undefined' ? window.location.host : 'localhost:3000')

type StorageKey = 'lastSelectedDongleId' | 'auth'
export const storage = {
  getKey: (key: StorageKey) => `connect:${key}`,
  getItem: (key: StorageKey): string | null => {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(storage.getKey(key))
  },
  setItem: (key: StorageKey, value: string): void => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(storage.getKey(key), value)
  },
  removeItem: (key: StorageKey) => {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(storage.getKey(key))
  },
}

let _accessToken: string | null = null
export const accessToken = () => {
  if (!_accessToken) _accessToken = storage.getItem('auth')
  return _accessToken
}

export function setAccessToken(token: string | null): void {
  _accessToken = token
  if (token === null) storage.removeItem('auth')
  else localStorage.setItem('auth', token)
}

export const isSignedIn = () => !!accessToken()

export const signOut = () => setAccessToken(null)
