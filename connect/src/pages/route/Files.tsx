import { FileType, Route, SegmentFiles } from '../../../../shared/types'
import { useState } from 'react'
import { FILE_INFO, parseRouteName, saveFile, getRouteUploadStatus, getSegmentUploadStatus, UploadStatus, cn } from '../../../../shared/helpers'
import { api } from '../../api'
import { useFiles } from '../../api/queries'
import { downloadFile, hevcToMp4, hevcBinsToMp4, tsFilesToMp4 } from '../../utils/ffmpeg'
import { useRouteParams } from '../../hooks'
import { ButtonBase } from '../../components/ButtonBase'
import { FPS } from '../../templates/shared'
import { IconButton } from '../../components/IconButton'
import { CircularProgress } from '../../components/CircularProgress'
import { CloudUploadIcon, ExternalLinkIcon, FileIcon, FilmIcon, LucideIcon, RefreshCwIcon, UploadIcon } from 'lucide-react'
import { useUploadProgress } from '../../hooks/useUploadProgress'
import { usePlayerStore } from '../../hooks/usePlayerStore'
import { useDevice } from '../../hooks/useDevice'
import { useAuth } from '../../hooks/useAuth'

const PRIORITY = 1 // Higher number is lower priority

const FileAction = ({
  Icon,
  label,
  onClick,
  href,
  download,
  loading,
  isUpload,
  disabled,
}: {
  Icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  download?: string
  loading?: number | boolean
  isUpload?: boolean
  disabled?: boolean
}) => {
  return (
    <ButtonBase
      onClick={onClick}
      href={href}
      download={download}
      disabled={disabled || !!loading}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50',
        isUpload ? 'bg-white text-black hover:bg-white/90' : 'bg-white/5 hover:bg-white/10 text-white',
      )}
    >
      {loading !== undefined ? (
        <CircularProgress loading={loading} className={cn('w-3.5 h-3.5 rounded-full ', isUpload ? 'text-black' : 'text-white')} />
      ) : (
        <Icon className="text-[16px]" />
      )}
      <span>{label}</span>
    </ButtonBase>
  )
}

const Upload = ({ type, files, route, segment }: { type: FileType; files: SegmentFiles; route: Route; segment: number }) => {
  const { call } = useDevice()
  const disabled = segment === -1 ? files[type].every(Boolean) : !!files[type][segment]
  const uploadProgress = useUploadProgress()
  if (disabled) return null
  // Check if this file type is currently uploading
  const fileName = FILE_INFO[type].name
  const segments = segment === -1 ? Array.from({ length: files.length }, (_, i) => i) : [segment]
  const isCurrentlyUploading = segments.some((s) => uploadProgress.isUploading(s, fileName))

  // Get the progress of the currently uploading segment
  const uploadingProgress = segments.map((s) => uploadProgress.getProgress(s, fileName)).filter((p): p is number => p !== undefined)
  const avgProgress = uploadingProgress.length > 0 ? uploadingProgress.reduce((a, b) => a + b, 0) / uploadingProgress.length : undefined
  return (
    <FileAction
      label={isCurrentlyUploading && avgProgress !== undefined ? `${Math.round(avgProgress * 100)}%` : 'Upload'}
      Icon={isCurrentlyUploading ? CloudUploadIcon : UploadIcon}
      isUpload
      loading={avgProgress}
      disabled={!call}
      onClick={async () => {
        const { dongleId, routeId } = parseRouteName(route.fullname)

        // Generating all the missing ones
        const paths: string[] = []
        for (const i of segments) {
          const name = FILE_INFO[type].name
          if (!files[type][i]) paths.push(`${routeId}--${i}/${name}`)
        }

        // Generating presigned urls for every one
        const presignedUrls = await api.device.uploadFiles.mutate({ params: { dongleId }, body: { expiry_days: 7, paths } })
        if (presignedUrls.status !== 200) throw new Error()

        if (paths.length === 0) return []
        await call!('uploadFilesToUrls', {
          files_data: paths.map((fn, i) => ({
            allow_cellular: false,
            fn,
            priority: PRIORITY,
            ...presignedUrls.body[i],
          })),
        })
        // Trigger a refetch of the upload queue
        uploadProgress.refetch()
      }}
    />
  )
}

const FullRouteDownload = ({ type, files }: { type: FileType; files: SegmentFiles }) => {
  const { dongleId, routeId: date, routeName } = useRouteParams()
  const [progress, setProgress] = useState<Record<number, number>>({})

  const values = Object.values(progress)
  const loading = values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined
  if (!files[type].every(Boolean)) return null

  if (type === 'logs' || type === 'qlogs')
    return <FileAction label={FILE_INFO[type].processed || 'View'} Icon={ExternalLinkIcon} href={`/${dongleId}/${date}/${type}`} />

  if (type === 'qcameras')
    return (
      <FileAction
        label={FILE_INFO.qcameras.processed || 'Download'}
        Icon={FilmIcon}
        loading={loading}
        onClick={async () => {
          setProgress({})

          const blob = await tsFilesToMp4(files[type], (loaded, total) => setProgress({ 0: loaded / total }))
          saveFile(blob, `${routeName}--${FILE_INFO[type].name.replace('.ts', '.mp4')}`)
          setProgress({ 0: 1 })
        }}
      />
    )

  return (
    <FileAction
      label={FILE_INFO[type].processed || 'Download'}
      Icon={FilmIcon}
      loading={loading}
      onClick={async () => {
        setProgress({})

        const bins = await Promise.all(files[type].map((file, i) => downloadFile(file!, ({ percent }) => setProgress((old) => ({ ...old, [i]: percent })))))
        const blob = await hevcBinsToMp4(bins)
        saveFile(blob, `${routeName}--${FILE_INFO[type].name.replace('.hevc', '.mp4')}`)
        setProgress(Object.fromEntries(bins.map((_, i) => [i, 1])))
      }}
    />
  )
}

const DownloadSegment = ({ type, files, segment }: { segment: number; type: FileType; files: SegmentFiles }) => {
  const { provider } = useAuth()
  const { routeName } = useRouteParams()
  const file = files[type][segment]
  if (!file) return null
  const name = `${routeName}--${segment}--${FILE_INFO[type].name}`
  if (provider === 'asius' && ['cameras', 'ecameras', 'dcameras'].includes(type))
    return <FileAction label={FILE_INFO[type].processed || 'Process'} Icon={FilmIcon} download={name.replace('.hevc', '.mp4')} href={file} />
  return <FileAction label={FILE_INFO[type].raw} Icon={FileIcon} href={file} download={name} />
}

const ProcessSegment = ({ type, files, segment }: { segment: number; type: FileType; files: SegmentFiles }) => {
  const { provider } = useAuth()
  const { dongleId, routeId: date, routeName } = useRouteParams()
  const file = files[type][segment]
  const [progress, setProgress] = useState<number>()

  if (!file) return null

  if (type === 'logs' || type === 'qlogs')
    return <FileAction label={FILE_INFO[type].processed || 'View'} Icon={ExternalLinkIcon} href={`/${dongleId}/${date}/${type}?segment=${segment}`} />

  if (type === 'qcameras')
    return (
      <FileAction
        label={FILE_INFO[type].processed || 'Process'}
        Icon={FilmIcon}
        loading={progress}
        onClick={async () => {
          setProgress(0)

          const blob = await tsFilesToMp4([file], (loaded, total) => setProgress(loaded / total))
          saveFile(blob, `${routeName}--${segment}--${FILE_INFO[type].name.replace('.ts', '.mp4')}`)
          setProgress(1)
        }}
      />
    )

  // Asius API returns already mp4 for videos
  if (provider === 'asius') return null

  return (
    <FileAction
      label={FILE_INFO[type].processed || 'Process'}
      Icon={FilmIcon}
      loading={progress}
      onClick={async () => {
        setProgress(0)

        const blob = await hevcToMp4(file, ({ percent }) => setProgress(percent))
        saveFile(blob, `${routeName}--${segment}--${FILE_INFO[type].name.replace('.hevc', '.mp4')}`)
        setProgress(1)
      }}
    />
  )
}

const SegmentDetails = ({ segment, files, route, setSegment }: { segment: number; files: SegmentFiles; route: Route; setSegment: (v: number) => void }) => {
  const isRoute = segment === -1
  const uploadProgress = useUploadProgress()

  return (
    <div className="flex flex-col gap-2">
      {FileType.options.map((type) => {
        const fileName = FILE_INFO[type].name
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
              <div title="1" className="h-0.75 w-full absolute bottom-0 translate-y-1/2 rounded-full overflow-hidden flex">
                {Array.from({ length: files.length }).map((_, i) => {
                  const isSegmentUploading = uploadProgress.isUploading(i, fileName)
                  const segmentProgress = uploadProgress.getProgress(i, fileName)
                  return (
                    <div
                      key={i}
                      title={isSegmentUploading ? `Segment ${i} - ${Math.round((segmentProgress ?? 0) * 100)}%` : `Segment ${i}`}
                      onClick={() => setSegment(i)}
                      className={cn(
                        'h-full cursor-pointer relative',
                        !files[type][i] ? 'bg-white/80' : type.startsWith('q') ? 'bg-blue-400' : 'bg-green-400',
                        segment !== i ? 'opacity-40' : 'opacity-80',
                        isSegmentUploading && 'animate-upload-pulse bg-yellow-400',
                      )}
                      style={{ width: `${(1 / files.length) * 100}%` }}
                    />
                  )
                })}
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

const SegmentGrid = ({ files, selectedSegment, onSelect }: { files: SegmentFiles; selectedSegment: number | null; onSelect: (i: number) => void }) => {
  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      <button
        className={cn(
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
            className={cn(
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

export const RouteFiles = ({ route, className }: { route: Route; className?: string }) => {
  const playerRef = usePlayerStore((x) => x.playerRef)
  const [files, { refetch, refetching }] = useFiles(route.fullname, route)
  const [segment, _setSegment] = useState<number>(-1) // ROUTE= -1
  const setSegment = (value: number) => {
    _setSegment(value)
    if (value !== -1) playerRef?.current?.seekTo(value * 60 * FPS)
  }

  const uploadProgress = useUploadProgress(refetch)

  return (
    <div className={cn('flex flex-col gap-2 bg-background-alt rounded-xl p-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
          Files
          {uploadProgress.queue.length > 0 && <span className="ml-2 text-yellow-400 animate-pulse">({uploadProgress.queue.length} uploading)</span>}
        </h3>
        <IconButton
          title="Refresh"
          onClick={() => void refetch()}
          icon={RefreshCwIcon}
          className={cn('text-xl text-white/40 hover:text-white transition-colors', refetching && 'animate-spin')}
        />
      </div>
      {files && (
        <>
          <SegmentGrid files={files} selectedSegment={segment} onSelect={setSegment} />

          <SegmentDetails segment={segment} files={files} route={route} setSegment={setSegment} />
        </>
      )}
    </div>
  )
}
