import type { Device, FileType, RouteInfo, RouteShareSignature } from '../types'
import { QueryClient } from '@tanstack/react-query'
import { env } from './env'

export const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnMount: false } } })

export const parseRouteName = (routeName: string): RouteInfo => {
  const [dongleId, routeId] = routeName.split(/[|/]/)
  return { dongleId, routeId }
}

export const keys = <T extends {}>(obj: T) => Object.keys(obj) as (keyof T)[]

export const getQCameraUrl = (routeName: string, signature: RouteShareSignature): string =>
  `${env.API_URL}/v1/route/${routeName.replace('/', '|')}/qcamera.m3u8?${new URLSearchParams(signature).toString()}`

export const setCookie = (name: string, token: string | null) => {
  const isLocal = window.location.hostname === 'localhost'

  const cookie = [
    `${name}=${token ?? ''}`,
    !isLocal && `Domain=.${window.location.host}`,
    !isLocal && `Secure`,
    token === null ? 'Expires=Thu, 01 Jan 1970 00:00:00 GMT' : `Max-Age=${60 * 60 * 24 * 30}`,
    `Path=/`,
    'SameSite=Lax',
  ]
    .filter(Boolean)
    .join('; ')
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
export const setAccessToken = (cookie: string | null) => setCookie('_accessToken', cookie)
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

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

export const FILE_INFO: Record<FileType, { name: string; raw: string; processed?: string; label: string; short: string }> = {
  cameras: {
    label: 'Road camera',
    short: 'Road',
    name: 'fcamera.hevc',
    raw: '.hevc',
    processed: '.mp4',
  },
  ecameras: {
    label: 'Wide-angle camera',
    short: 'Wide',
    name: 'ecamera.hevc',
    raw: '.hevc',
    processed: '.mp4',
  },
  dcameras: {
    label: 'Driver camera',
    short: 'Driver',
    name: 'dcamera.hevc',
    raw: '.hevc',
    processed: '.mp4',
  },
  qcameras: {
    label: 'Quantized camera',
    short: 'Quantized',
    name: 'qcamera.ts',
    raw: '.ts',
    processed: '.m3u8',
  },
  logs: {
    label: 'Logs',
    short: 'Logs',
    name: 'rlog.zst',
    raw: '.zst',
    processed: 'View',
  },
  qlogs: {
    label: 'Quantized logs',
    short: 'Quantized',
    name: 'qlog.zst',
    raw: '.zst',
    processed: 'View',
  },
}
