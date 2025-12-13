import { FileType, Route, SegmentFiles } from '../types'
import { RefObject, useState } from 'react'
import {
  concatBins,
  getQCameraUrl,
  FILE_INFO,
  parseRouteName,
  saveFile,
  toSegmentFiles,
  getRouteUploadStatus,
  getSegmentUploadStatus,
  UploadStatus,
} from '../utils/helpers'
import { api } from '../api'
import { callAthena } from '../api/athena'
import { useFiles, useShareSignature } from '../api/queries'
import { downloadFile, hevcToMp4 } from '../utils/ffmpeg'
import clsx from 'clsx'
import { useRouteParams } from '../utils/hooks'
import { Icon } from './Icon'
import { ButtonBase } from './ButtonBase'
import { PlayerRef } from '@remotion/player'
import { FPS } from '../../templates/shared'

const PRIORITY = 1 // Higher number is lower priority
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // Uploads expire after 1 week if device remains offline

export const uploadSegments = async (routeName: string, segments: number[], types: FileType[], files: SegmentFiles) => {
  const { dongleId, routeId } = parseRouteName(routeName)

  // Generating all the missing ones
  const paths: string[] = []
  for (const i of segments) {
    for (const type of types) {
      const name = FILE_INFO[type].name
      if (!files[type][i]) paths.push(`${routeId}--${i}/${name}`)
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

const FileAction = ({
  icon,
  label,
  onClick,
  href,
  download,
  loading,
  uploadButton,
}: {
  icon: string
  label: string
  onClick?: () => void
  href?: string
  download?: string
  loading?: number | boolean
  uploadButton?: boolean
}) => {
  return (
    <ButtonBase
      onClick={onClick}
      href={href}
      download={download}
      disabled={!!loading}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50',
        uploadButton ? 'bg-white text-black hover:bg-white/90' : 'bg-white/5 hover:bg-white/10 text-white',
      )}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      ) : (
        <Icon name={icon as any} className="text-[16px]" />
      )}
      <span>{label}</span>
    </ButtonBase>
  )
}

const Upload = ({ type, files, route, segment }: { type: FileType; files: SegmentFiles; route: Route; segment: number }) => {
  const [isLoading, setIsLoading] = useState(false)

  const disabled = segment === -1 ? files[type].every(Boolean) : !!files[type][segment]
  if (disabled) return null
  return (
    <FileAction
      label="Upload"
      icon="upload"
      uploadButton
      loading={isLoading}
      onClick={async () => {
        setIsLoading(true)
        const segments = segment === -1 ? Array.from({ length: files.length }, (_, i) => i) : [segment]
        await uploadSegments(route.fullname, segments, [type], files)
        setIsLoading(false)
      }}
    />
  )
}

const QCameraDownload = () => {
  const { routeName } = useRouteParams()
  const [signature] = useShareSignature(routeName)
  return (
    <FileAction
      label={FILE_INFO.qcameras.processed!}
      icon="movie"
      download={`${routeName}--${FILE_INFO.qcameras.name}`}
      href={signature ? getQCameraUrl(routeName, signature) : undefined}
    />
  )
}
const FullRouteDownload = ({ type, files }: { type: FileType; files: SegmentFiles }) => {
  const { dongleId, date, routeName } = useRouteParams()
  const [progress, setProgress] = useState<Record<number, number>>({})

  const values = Object.values(progress)
  const loading = values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined
  if (!files[type].every(Boolean)) return null

  if (type === 'logs' || type === 'qlogs')
    return <FileAction label={FILE_INFO[type].processed || 'View'} icon="open_in_new" href={`/${dongleId}/${date}/${type}`} />

  if (type === 'qcameras') return <QCameraDownload />

  return (
    <FileAction
      label={FILE_INFO[type].processed || 'Download'}
      icon="movie"
      loading={loading}
      onClick={async () => {
        setProgress({})

        const bins = await Promise.all(
          files[type].map((file, i) => downloadFile(file!, ({ percent }) => setProgress((old) => ({ ...old, [i]: percent })))),
        )
        const bin = concatBins(bins)
        const blob = await hevcToMp4(bin, () => {})
        saveFile(blob, `${routeName}--${FILE_INFO[type].name.replace('.hevc', '.mp4')}`)
      }}
    />
  )
}

const DownloadSegment = ({ type, files, segment }: { segment: number; type: FileType; files: SegmentFiles }) => {
  const { routeName } = useRouteParams()
  const file = files[type][segment]
  if (!file) return null
  return <FileAction label={FILE_INFO[type].raw} icon="raw_on" href={file} download={`${routeName}--${segment}--${FILE_INFO[type].name}`} />
}

const ProcessSegment = ({ type, files, segment }: { segment: number; type: FileType; files: SegmentFiles }) => {
  const { dongleId, date, routeName } = useRouteParams()
  const file = files[type][segment]
  const [progress, setProgress] = useState<number>()

  if (!file) return null

  if (type === 'qcameras') return null

  if (type === 'logs' || type === 'qlogs')
    return (
      <FileAction label={FILE_INFO[type].processed || 'View'} icon="open_in_new" href={`/${dongleId}/${date}/${type}?segment=${segment}`} />
    )

  return (
    <FileAction
      label={FILE_INFO[type].processed || 'Process'}
      icon="movie"
      loading={progress}
      onClick={async () => {
        setProgress(0)

        const blob = await hevcToMp4(file, ({ percent }) => setProgress(percent))
        saveFile(blob, `${routeName}--${segment}--${FILE_INFO[type].name.replace('.hevc', '.mp4')}`)
      }}
    />
  )
}

const SegmentDetails = ({
  segment,
  files,
  route,
  setSegment,
}: {
  segment: number
  files: SegmentFiles
  route: Route
  setSegment: (v: number) => void
}) => {
  const isRoute = segment === -1

  return (
    <div className="flex flex-col gap-2">
      {FileType.options.map((type) => {
        return (
          <div key={`${type}-${segment}`} className="flex flex-col gap-2 py-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">{FILE_INFO[type].label}</span>
              <div className="flex gap-2 items-center">
                {isRoute ? (
                  <FullRouteDownload type={type} files={files} />
                ) : (
                  <>
                    <DownloadSegment type={type} files={files} segment={segment} />
                    <ProcessSegment type={type} files={files} segment={segment} />
                  </>
                )}
                <Upload type={type} files={files} route={route} segment={segment} />
              </div>
              <div title="1" className="h-[3px] w-full absolute bottom-0 translate-y-1/2 rounded-full overflow-hidden flex">
                {Array.from({ length: files.length }).map((_, i) => (
                  <div
                    key={i}
                    title={`Segment ${i}`}
                    onClick={() => setSegment(i)}
                    className={clsx(
                      'h-full cursor-pointer',
                      !files[type][i] ? 'bg-white/80' : type.startsWith('q') ? 'bg-blue-400' : 'bg-green-400',
                      segment !== i ? 'opacity-40' : 'opacity-80',
                    )}
                    style={{ width: `${(1 / files.length) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const getStatusColor = (status: UploadStatus) => {
  return {
    all: 'bg-green-500/20 text-green-400 border-green-500/30',
    quantized: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    loading: 'bg-white/30 text-white/70 border-white/30',
  }[status]
}

const SegmentGrid = ({
  files,
  selectedSegment,
  onSelect,
}: {
  files: SegmentFiles
  selectedSegment: number | null
  onSelect: (i: number) => void
}) => {
  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      <button
        className={clsx(
          'h-8 px-3 flex items-center justify-center rounded-lg text-xs font-bold border transition-all',
          getStatusColor(getRouteUploadStatus(files)),
          selectedSegment === -1 && 'ring-2 ring-white border-transparent bg-white text-black',
        )}
        onClick={() => onSelect(-1)}
      >
        All
      </button>

      {Array.from({ length: files.length }).map((_, i) => {
        return (
          <button
            key={i}
            className={clsx(
              'h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all',
              getStatusColor(getSegmentUploadStatus(files, i)),
              selectedSegment === i && 'ring-2 ring-white border-transparent bg-white text-black',
            )}
            onClick={() => onSelect(i)}
          >
            {i}
          </button>
        )
      })}
    </div>
  )
}

export const RouteFiles = ({
  route,
  className,
  playerRef,
}: {
  playerRef: RefObject<PlayerRef | null>
  route: Route
  className?: string
}) => {
  const [files] = useFiles(route.fullname)
  const [segment, _setSegment] = useState<number>(-1) // ROUTE= -1
  const setSegment = (value: number) => {
    _setSegment(value)
    if (value !== -1) playerRef.current?.seekTo(value * 60 * FPS)
  }
  const segmentFiles = files ? toSegmentFiles(files, route.maxqlog + 1) : undefined
  return (
    <div className={clsx('flex flex-col gap-4 bg-background-alt rounded-xl p-4', className)}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Files</h3>
      {segmentFiles && (
        <>
          <SegmentGrid files={segmentFiles} selectedSegment={segment} onSelect={setSegment} />

          <SegmentDetails segment={segment} files={segmentFiles} route={route} setSegment={setSegment} />
        </>
      )}
    </div>
  )
}
