import type { Device, RouteInfo } from '../types'
import { QueryClient } from '@tanstack/react-query'
import { env } from './env'

export const queryClient = new QueryClient({})

export const parseRouteName = (routeName: string): RouteInfo => {
  const [dongleId, routeId] = routeName.split(/[|/]/)
  return { dongleId, routeId }
}

export const keys = <T extends {}>(obj: T) => Object.keys(obj) as (keyof T)[]

type StorageKey = 'lastSelectedDongleId' | 'auth' | 'largeCameraType' | 'smallCameraType' | 'logType' | 'imperial' | 'imperial'
export const storage = {
  get: <T extends string>(key: StorageKey): T | undefined => {
    if (typeof localStorage === 'undefined') return undefined
    return (localStorage.getItem(key) as T) ?? undefined
  },
  set: (key: StorageKey, value: string | undefined): void => {
    if (typeof localStorage === 'undefined') return
    value === undefined ? localStorage.removeItem(key) : localStorage.setItem(key, value)
  },
}

export const setAccessToken = (token: string | null) => {
  const isLocal = window.location.hostname === 'localhost'

  const cookie = [
    `_accessToken=${token ?? ''}`,
    !isLocal && `Domain=.${window.location.host}`,
    !isLocal && `Secure`,
    token === null ? 'Expires=Thu, 01 Jan 1970 00:00:00 GMT' : `Max-Age=${60 * 60 * 24 * 30}`,
    `Path=/`,
    'SameSite=Lax',
  ]
    .filter(Boolean)
    .join('; ')
  console.log(cookie)
  document.cookie = cookie
}

export const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

export const accessToken = () => getCookie('_accessToken')

export const isSignedIn = () => !!accessToken()

export const signOut = () => {
  setAccessToken(null)
  queryClient.clear()
}

export const createSharedDevice = (dongleId: string): Device => ({
  dongle_id: dongleId,
  alias: env.SHARED_DEVICE,
  serial: '',
  last_athena_ping: 0,
  ignore_uploads: null,
  is_paired: true,
  is_owner: false,
  public_key: '',
  prime: false,
  prime_type: 0,
  trial_claimed: false,
  device_type: '',
  openpilot_version: '',
  sim_id: '',
  sim_type: 0,
  eligible_features: {
    prime: false,
    prime_data: false,
    nav: false,
  },
  athena_host: null,
})

export const saveFile = (blobOrUrl: Blob | string, fileName: string) => {
  const a = document.createElement('a')
  a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl)
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export const concatBins = (chunks: Uint8Array[]) => {
  const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)

  let offset = 0
  for (const arr of chunks) {
    result.set(arr, offset)
    offset += arr.length
  }

  return result
}
