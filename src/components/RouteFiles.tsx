import type { Files, Route } from '../types'
import { useState } from 'react'
import { concatBins, createQCameraStreamUrl, parseRouteName, saveFile } from '../utils/helpers'
import { z } from 'zod'
import { api } from '../api'
import { callAthena } from '../api/athena'
import { useFiles, useShareSignature } from '../api/queries'
import { IconButton } from './material/IconButton'
import { downloadFile, hevcToMp4 } from '../utils/ffmpeg'
import clsx from 'clsx'
import { getRouteDuration } from '../utils/format'
import { useParams } from '../utils/hooks'

const PRIORITY = 1 // Higher number is lower priority
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // Uploads expire after 1 week if device remains offline

const FileType = z.enum(['cameras', 'ecameras', 'dcameras', 'qcameras', 'logs', 'qlogs'])
type FileType = z.infer<typeof FileType>

const FILE_NAMES = {
  cameras: 'fcamera.hevc',
  ecameras: 'ecamera.hevc',
  dcameras: 'dcamera.hevc',
  qcameras: 'qcamera.ts',
  logs: 'rlog.zst',
  qlogs: 'qlog.zst',
}
const FILE_LABELS = {
  cameras: 'Road camera',
  ecameras: 'Wide-angle camera',
  dcameras: 'Driver camera',
  qcameras: 'Quantized road camera',
  logs: 'Logs',
  qlogs: 'Quantized logs',
}

export const uploadSegments = async (routeName: string, segments: number[], types: FileType[], files: Files) => {
  const { dongleId, routeId } = parseRouteName(routeName)

  // Generating all the missing ones
  const paths: string[] = []
  for (const i of segments) {
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

const Upload = ({ type, files, route, segment }: { type: FileType; files: Files; route: Route; segment: number }) => {
  const [isLoading, setIsLoading] = useState(false)
  const totalSegments = route.maxqlog + 1

  const disabled =
    segment === -1 ? files[type].length === totalSegments : !!files[type].find((x) => x.includes(`/${segment}/${FILE_NAMES[type]}`))
  if (disabled) return null
  return (
    <IconButton
      name="upload"
      loading={isLoading}
      onClick={async () => {
        setIsLoading(true)
        const segments = segment === -1 ? Array.from({ length: totalSegments }, (_, i) => i) : [segment]
        await uploadSegments(route.fullname, segments, [type], files)
        setIsLoading(false)
      }}
    />
  )
}

const FullRouteDownload = ({ type, files, route }: { type: FileType; files: Files; route: Route }) => {
  const { dongleId, date, routeName } = useParams()
  const [progress, setProgress] = useState<Record<number, number>>({})
  const totalSegments = route.maxqlog + 1

  const values = Object.values(progress)
  const loading = values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined
  const [signature] = useShareSignature(routeName)
  if (files[type].length !== totalSegments) return null

  if (type === 'logs' || type === 'qlogs') return <IconButton name="file_json" href={`/${dongleId}/routes/${date}/${type}`} />
  if (type === 'qcameras') return <IconButton name="raw_on" href={signature ? createQCameraStreamUrl(routeName, signature) : undefined} />

  return (
    <IconButton
      name="movie"
      loading={loading}
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

const DownloadSegment = ({ type, files, segment }: { segment: number; type: FileType; files: Files }) => {
  const { routeName } = useParams()
  const file = files[type].find((x) => x.includes(`/${segment}/${FILE_NAMES[type]}`))
  if (!file) return null
  return <IconButton name="raw_on" href={file} download={`${routeName}--${segment}--${FILE_NAMES[type]}`} />
}

const ProcessSegment = ({ type, files, segment }: { segment: number; type: FileType; files: Files }) => {
  const { dongleId, date, routeName } = useParams()
  const file = files[type].find((x) => x.includes(`/${segment}/${FILE_NAMES[type]}`))
  const [progress, setProgress] = useState<number>()

  if (!file) return null
  if (type === 'logs' || type === 'qlogs')
    return <IconButton name="file_json" href={`/${dongleId}/routes/${date}/${type}?segment=${segment}`} />
  if (type === 'qcameras') return null
  return (
    <IconButton
      name="movie"
      loading={progress}
      onClick={async () => {
        setProgress(0)

        const blob = await hevcToMp4(file, ({ percent }) => setProgress(percent))
        saveFile(blob, `${routeName}--${segment}--${FILE_NAMES[type].replace('.hevc', '.mp4')}`)
      }}
    />
  )
}

const SegmentDetails = ({ segment, files, route }: { segment: number; files: Files; route: Route }) => {
  const isRoute = segment === -1

  return (
    <div className="flex flex-col gap-1">
      {FileType.options.map((type) => {
        return (
          <div key={`${type}-${segment}`} className="flex items-center justify-between py-1 px-2 rounded-xl hover:bg-white/5 ">
            <span className="text-base font-medium text-gray-200">{FILE_LABELS[type]}</span>

            <div className="flex gap-2 items-center">
              <div>
                {isRoute ? (
                  <FullRouteDownload type={type} files={files} route={route} />
                ) : (
                  <>
                    <DownloadSegment type={type} files={files} segment={segment} />
                    <ProcessSegment type={type} files={files} segment={segment} />
                  </>
                )}
              </div>
              <div className="flex w-8">
                <Upload type={type} files={files} route={route} segment={segment} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SegmentGrid = ({
  totalSegments,
  files,
  route,
  selectedSegment,
  onSelect,
}: {
  totalSegments: number
  files: Files
  route: Route
  selectedSegment: number | null
  onSelect: (i: number) => void
}) => {
  const { dongleId, routeId } = parseRouteName(route.fullname)

  // Calculate FULL status
  let allStatus = 'empty'
  let totalPossibleFiles = totalSegments * FileType.options.length
  let totalCurrentFiles = 0
  for (const type of FileType.options) {
    totalCurrentFiles += files[type].length
  }
  if (totalCurrentFiles === totalPossibleFiles) allStatus = 'full'
  else if (totalCurrentFiles > 0) allStatus = 'partial'

  const getAllBgClass = (status: string, isSelected: boolean) => {
    let bg = 'bg-gray-800'
    if (status === 'full') bg = 'bg-green-900'
    else if (status === 'partial') bg = 'bg-yellow-900'
    if (isSelected) bg = 'ring-2 ring-white ' + bg
    return bg
  }

  return (
    <div className="flex flex-wrap gap-1 p-2">
      <div
        className={`h-8 px-3 flex items-center justify-center rounded-3xl cursor-pointer text-xs font-bold ${getAllBgClass(allStatus, selectedSegment === -1)} hover:opacity-80`}
        onClick={() => onSelect(-1)}
      >
        Route
      </div>

      {Array.from({ length: totalSegments }).map((_, i) => {
        let count = 0
        for (const type of FileType.options) {
          const key = [dongleId, routeId, i, FILE_NAMES[type]].join('/')
          if (files[type].find((path) => path.includes(key))) count++
        }
        const status = count === FileType.options.length ? 'full' : count > 0 ? 'partial' : 'empty'
        const bgClass = status === 'full' ? 'bg-green-900' : status === 'partial' ? 'bg-yellow-900' : 'bg-red-800'

        return (
          <div
            key={i}
            className={clsx(
              'h-8 w-8 flex items-center justify-center rounded-3xl cursor-pointer text-xs hover:opacity-80',
              bgClass,
              selectedSegment === i && 'ring-2 ring-white ',
            )}
            onClick={() => onSelect(i)}
          >
            {i}
          </div>
        )
      })}
    </div>
  )
}

const format = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, '0')
  return `${min}:${sec}`
}

export const RouteFiles = ({ route }: { route: Route }) => {
  const [files] = useFiles(route.fullname, 10_000)
  const totalSegments = route.maxqlog + 1
  const [segment, setSegment] = useState<number>(-1) // ROUTE= -1

  const isFull = segment === -1
  const routeDuration = getRouteDuration(route)?.asSeconds()
  if (!files || !routeDuration) return null

  const startTime = isFull ? 0 : segment * 60
  const endTime = isFull ? routeDuration : Math.min((segment + 1) * 60, routeDuration)
  return (
    <div className="flex flex-col rounded-xl bg-background-alt p-4 gap-3">
      <h3 className="text-2xl font-bold mb-2">
        {isFull ? 'Route files' : `Segment ${segment} files`} ({format(startTime)} - {format(endTime)})
      </h3>
      <SegmentDetails segment={segment} files={files} route={route} />
      <SegmentGrid totalSegments={totalSegments} files={files} route={route} selectedSegment={segment} onSelect={setSegment} />
    </div>
  )
}
