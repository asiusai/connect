import { RouteInfo, UploadFile, UploadFileMetadata } from '../types'
import { api } from '.'
import { parseRouteName } from '../utils/helpers'
import { callAthena } from './athena'

export const FileTypes = {
  logs: ['rlog.bz2', 'rlog.zst'],
  cameras: ['fcamera.hevc'],
  dcameras: ['dcamera.hevc'],
  ecameras: ['ecamera.hevc'],
}

export type FileType = keyof typeof FileTypes

// Higher number is lower priority
export const COMMA_CONNECT_PRIORITY = 1

// Uploads expire after 1 week if device remains offline
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7

export const uploadFilesToUrls = async (dongleId: string, files: UploadFile[]) => {
  return await callAthena({
    type: 'uploadFilesToUrls',
    dongleId,
    params: {
      files_data: files.map((file) => ({
        allow_cellular: false,
        fn: file.filePath,
        headers: file.headers,
        priority: COMMA_CONNECT_PRIORITY,
        url: file.url,
      })),
    },
    expiry: Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS,
  })
}

export const getAlreadyUploadedFiles = async (routeName: string) => {
  const res = await api.file.files.query({ params: { routeName } })
  if (res.status !== 200) throw new Error()
  return res.body
}

const getFiles = async (routeName: string, types?: FileType[]) => {
  const files = await getAlreadyUploadedFiles(routeName)
  if (!types) return [...files.cameras, ...files.dcameras, ...files.ecameras, ...files.logs]
  return types.flatMap((type) => files[type])
}

const generateMissingFilePaths = (
  routeInfo: RouteInfo,
  segmentStart: number,
  segmentEnd: number,
  uploadedFiles: string[],
  types?: FileType[],
): string[] => {
  const paths: string[] = []
  for (let i = segmentStart; i <= segmentEnd; i++) {
    const fileTypes = types ? types.flatMap((type) => FileTypes[type]) : Object.values(FileTypes).flat()
    for (const fileName of fileTypes) {
      const key = [routeInfo.dongleId, routeInfo.routeId, i, fileName].join('/')
      if (!uploadedFiles.find((path) => path.includes(key))) {
        paths.push(`${routeInfo.routeId}--${i}/${fileName}`)
      }
    }
  }
  return paths
}

const prepareUploadRequests = (paths: string[], presignedUrls: UploadFileMetadata[]): UploadFile[] => {
  return paths.map((path, i) => ({ filePath: path, ...presignedUrls[i] }))
}
export const uploadAllSegments = (routeName: string, totalSegments: number, types?: FileType[]) => {
  return uploadSegments(routeName, 0, totalSegments - 1, types)
}

export const requestToUploadFiles = async (dongleId: string, paths: string[], expiryDays: number = 7) => {
  const pathPresignedUrls = await api.file.uploadFiles.mutate({
    params: { dongleId },
    body: { expiry_days: expiryDays, paths },
  })
  if (pathPresignedUrls.status !== 200) return []
  return pathPresignedUrls.body
}

export const uploadSegments = async (routeName: string, segmentStart: number, segmentEnd: number, types?: FileType[]) => {
  const routeInfo = parseRouteName(routeName)
  const alreadyUploadedFiles = await getFiles(routeName, types)

  const paths = generateMissingFilePaths(routeInfo, segmentStart, segmentEnd, alreadyUploadedFiles, types)
  const pathPresignedUrls = await requestToUploadFiles(routeInfo.dongleId, paths)

  const athenaRequests = prepareUploadRequests(paths, pathPresignedUrls)
  if (athenaRequests.length === 0) return []
  return await uploadFilesToUrls(routeInfo.dongleId, athenaRequests)
}
