import { Button } from './material/Button'
import type { Files, Route } from '../types'
import { useState } from 'react'
import { parseRouteName } from '../utils/helpers'
import { z } from 'zod'
import { api } from '../api'
import { callAthena } from '../api/athena'
import { useFiles } from '../api/queries'

const FileType = z.enum(['cameras', 'dcameras', 'ecameras', 'logs'])
type FileType = z.infer<typeof FileType>

const PRIORITY = 1 // Higher number is lower priority
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // Uploads expire after 1 week if device remains offline

export const uploadSegments = async (routeName: string, totalSegments: number, types: FileType[], files: Files) => {
  const { dongleId, routeId } = parseRouteName(routeName)

  // Generating all the missing ones
  const paths: string[] = []
  for (let i = 0; i < totalSegments; i++) {
    for (const fileName of types) {
      const key = [dongleId, routeId, i, fileName].join('/')
      if (!files[fileName].find((path) => path.includes(key))) {
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

const FILES: { text: string; type: FileType }[] = [
  { text: 'Road', type: 'cameras' },
  { text: 'Wide', type: 'ecameras' },
  { text: 'Driver', type: 'dcameras' },
  { text: 'Logs', type: 'logs' },
]
export const RouteUploadButtons = ({ route }: { route: Route }) => {
  const [files] = useFiles(route.fullname)
  const [loading, setLoading] = useState<FileType[]>([])

  const totalSegments = route.maxqlog + 1

  return (
    <div className="flex flex-col rounded-b-md m-5">
      {files &&
        FILES.map(({ text, type }) => (
          <div key={type} className="flex flex-col items-center">
            <p>
              Uploaded {files[type].length}/{totalSegments}
            </p>
            <Button
              loading={loading.includes(type)}
              disabled={files[type].length === totalSegments}
              onClick={async () => {
                setLoading((l) => [...l, type])
                await uploadSegments(route.fullname, totalSegments, [type], files)
              }}
            >
              Upload {text}
            </Button>
          </div>
        ))}
    </div>
  )
}
