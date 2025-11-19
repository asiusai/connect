import type { Files, Route } from '../types'
import { useState } from 'react'
import { concatBins, parseRouteName, saveFile } from '../utils/helpers'
import { z } from 'zod'
import { api } from '../api'
import { callAthena } from '../api/athena'
import { useFiles } from '../api/queries'
import { IconButton } from './material/IconButton'
import { downloadFile, hevcToMp4 } from '../utils/ffmpeg'

const PRIORITY = 1 // Higher number is lower priority
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // Uploads expire after 1 week if device remains offline

const FileType = z.enum(['cameras', 'dcameras', 'ecameras', 'logs'])
type FileType = z.infer<typeof FileType>

const FILE_NAMES = {
  logs: 'rlog.zst',
  cameras: 'fcamera.hevc',
  dcameras: 'dcamera.hevc',
  ecameras: 'ecamera.hevc',
}
const FILE_LABELS = {
  cameras: 'road',
  ecameras: 'wide',
  dcameras: 'driver',
  logs: 'logs',
}
export const uploadSegments = async (routeName: string, totalSegments: number, types: FileType[], files: Files) => {
  const { dongleId, routeId } = parseRouteName(routeName)

  // Generating all the missing ones
  const paths: string[] = []
  for (let i = 0; i <= totalSegments; i++) {
    for (const type of types) {
      const name = FILE_NAMES[type]
      const key = [dongleId, routeId, i, name].join('/')
      if (!files[type].find((path) => path.includes(key))) {
        paths.push(`${routeId}--${i}/${name}`)
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

const Processed = ({ type, file, namePrefix }: { namePrefix: string; type: FileType; file: string }) => {
  const [progress, setProgress] = useState<number>()
  if (type === 'logs') return null
  return (
    <IconButton
      name="movie"
      loading={progress}
      onClick={async () => {
        setProgress(0)

        const blob = await hevcToMp4(file, ({ percent }) => setProgress(percent))
        saveFile(blob, namePrefix + FILE_NAMES[type].replace('.hevc', '.mp4'))
      }}
    />
  )
}

const Upload = ({ type, files, route }: { type: FileType; files: Files; route: Route }) => {
  const [isLoading, setIsLoading] = useState(false)
  const totalSegments = route.maxqlog + 1

  const disabled = files[type].length === totalSegments
  return (
    <IconButton
      name="upload"
      loading={isLoading && !disabled}
      disabled={disabled || isLoading}
      onClick={async () => {
        setIsLoading(true)
        await uploadSegments(route.fullname, totalSegments, [type], files)
      }}
    >
      Upload {type}
    </IconButton>
  )
}

const CombineVideos = ({ type, files, route }: { type: FileType; files: Files; route: Route }) => {
  const [progress, setProgress] = useState<Record<number, number>>({})
  const totalSegments = route.maxqlog + 1
  const disabled = files[type].length !== totalSegments

  if (type === 'logs') return null

  const values = Object.values(progress)
  const loading = values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined

  return (
    <IconButton
      name="movie"
      loading={loading}
      disabled={disabled || loading !== undefined}
      onClick={async () => {
        setProgress({})

        const bins = await Promise.all(
          files[type].map((file, i) => downloadFile(file, ({ percent }) => setProgress((old) => ({ ...old, [i]: percent })))),
        )
        const bin = concatBins(bins)
        const blob = await hevcToMp4(bin, () => {})
        saveFile(blob, `${route.fullname}--${FILE_NAMES[type].replace('.hevc', '.mp4')}`)
      }}
    />
  )
}

export const RouteFiles = ({ route }: { route: Route }) => {
  const [files] = useFiles(route.fullname)
  const totalSegments = route.maxqlog + 1
  const arr = Array.from({ length: totalSegments })

  if (!files) return null
  return (
    <div className="flex flex-col rounded-b-md m-5  text-center">
      <table className="table-auto">
        <thead>
          <tr>
            <th></th>
            {FileType.options.map((type) => (
              <th key={type}>{FILE_LABELS[type]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arr.map((_, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              {FileType.options.map((type) => {
                const file = files[type].find((x) => x.includes(`/${i}/${FILE_NAMES[type]}`))
                const namePrefix = `${route.fullname}--${i}--`
                return (
                  <td key={type}>
                    {file ? (
                      <>
                        <IconButton href={file} download={namePrefix + FILE_NAMES[type]} name="raw_on" />
                        <Processed file={file} type={type} namePrefix={namePrefix} />
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <td>Full</td>
            {FileType.options.map((type) => (
              <td key={type}>
                <CombineVideos type={type} files={files} route={route} />
              </td>
            ))}
          </tr>
          <tr>
            <td>Upload</td>
            {FileType.options.map((type) => (
              <td key={type}>
                <Upload type={type} files={files} route={route} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
