import { DerivedFile, FileName, Files, FileType, Route, RouteInfo, RouteShareSignature, SegmentFiles } from '../types'
import { env } from './env'
import { storage } from './storage'

export const getRouteUrl = (route: Route, segment: number, fn: DerivedFile) => `${route.url?.replace('https://api.konik.ai', env.API_URL)}/${segment}/${fn}`

export const parseRouteName = (routeName: string): RouteInfo => {
  const [dongleId, routeId] = routeName.split(/[|/]/)
  return { dongleId, routeId }
}

export const keys = <T extends {}>(obj: T) => Object.keys(obj) as (keyof T)[]

export const getQCameraUrl = (routeName: string, signature: RouteShareSignature): string =>
  `${env.API_URL}/v1/route/${routeName.replace('/', '|')}/qcamera.m3u8?${new URLSearchParams(signature).toString()}`

export const findFile = (files: Files, type: FileType, segment: number) => files[type].find((x) => x.includes(`/${segment}/${FILE_INFO[type].name}`))

export const accessToken = () => storage.get('accessToken')
export const setAccessToken = (token: string | undefined) => storage.set('accessToken', token)
export const isSignedIn = () => !!accessToken()

export const signOut = async () => {
  setAccessToken(undefined)
  const { invalidate } = await import('../api')
  invalidate()
}

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

export const FILE_INFO: Record<FileType, { name: FileName; raw: string; processed?: string; label: string; short: string }> = {
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

export const toSegmentFiles = (files: Files, length: number | undefined): SegmentFiles => {
  if (!length) length = Math.max(...FileType.options.map((x) => files[x].length))
  const out: SegmentFiles = { length, cameras: [], dcameras: [], ecameras: [], logs: [], qcameras: [], qlogs: [] }
  for (const key of keys(files)) {
    for (let i = 0; i < length; i++) out[key][i] = findFile(files, key, i)?.replace('https://api.konik.ai', env.API_URL)
  }
  return out
}

export type UploadStatus = 'loading' | 'quantized' | 'all'

export const getSegmentUploadStatus = (files: SegmentFiles, segment: number): UploadStatus => {
  if (!files.qlogs[segment] || !files.qcameras[segment]) return 'loading'

  for (const type of FileType.options.filter((x) => !x.startsWith('q'))) if (!files[type][segment]) return 'quantized'

  return 'all'
}

export const getRouteUploadStatus = (files: SegmentFiles): UploadStatus => {
  let status: UploadStatus = 'all'

  for (let i = 0; i < files.length; i++) {
    const s = getSegmentUploadStatus(files, i)
    if (s === 'loading') return 'loading'
    if (s === 'quantized') status = 'quantized'
  }

  return status
}

export const encode = (v: string) => btoa(String.fromCharCode(...new TextEncoder().encode(v)))

export const decode = (v: string | null | undefined) => {
  if (!v) return undefined
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0)))
  } catch {
    return atob(v)
  }
}

export const parse = <T>(str: string | null | undefined): T | undefined => {
  if (str === undefined || str === null) return
  try {
    return JSON.parse(str)
  } catch {
    return undefined
  }
}

export const truncate = (s: string, len: number) => (s.length > len ? s.slice(0, len) + '...' : s)
