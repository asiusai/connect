import { api } from '.'
import { parseRouteName } from '../utils/helpers'
import { callAthena } from './athena'
import { z } from 'zod'

export const FileType = z.enum(['cameras', 'dcameras', 'ecameras', 'logs'])
export type FileType = z.infer<typeof FileType>

const PRIORITY = 1 // Higher number is lower priority
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // Uploads expire after 1 week if device remains offline

export const uploadSegments = async (routeName: string, totalSegments: number, types: FileType[] = FileType.options) => {
  const { dongleId, routeId } = parseRouteName(routeName)

  // Getting already uploaded files
  const res = await api.file.files.query({ params: { routeName } })
  if (res.status !== 200) throw new Error()
  const files = types.flatMap((type) => res.body[type])

  // Generating all the missing ones
  const paths: string[] = []
  for (let i = 0; i < totalSegments; i++) {
    for (const fileName of types) {
      const key = [dongleId, routeId, i, fileName].join('/')
      if (!files.find((path) => path.includes(key))) {
        paths.push(`${routeId}--${i}/${fileName}`)
      }
    }
  }

  // Generating presigned urls for every one
  const presignedUrls = await api.file.uploadFiles.mutate({ params: { dongleId }, body: { expiry_days: 7, paths } })
  if (presignedUrls.status !== 200) throw new Error()

  if (paths.length === 0) return []
  return await callAthena({
    type: 'uploadFilesToUrls',
    dongleId,
    params: { files_data: paths.map((fn, i) => ({ allow_cellular: false, fn, priority: PRIORITY, ...presignedUrls.body[i] })) },
    expiry: Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS,
  })
}
