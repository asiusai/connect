import { Files, FileType, Route } from '../types'
import { useState } from 'react'
import { concatBins, FILE_INFO, parseRouteName, saveFile } from '../utils/helpers'
import { api } from '../api'
import { callAthena } from '../api/athena'
import { useFiles } from '../api/queries'
import { downloadFile, hevcToMp4 } from '../utils/ffmpeg'
import clsx from 'clsx'
import { useRouteParams } from '../utils/hooks'
import { Icon } from './Icon'

const PRIORITY = 1 // Higher number is lower priority
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // Uploads expire after 1 week if device remains offline

export const uploadSegments = async (routeName: string, segments: number[], types: FileType[], files: Files) => {
  const { dongleId, routeId } = parseRouteName(routeName)

  // Generating all the missing ones
  const paths: string[] = []
  for (const i of segments) {
    for (const type of types) {
      const name = FILE_INFO[type].name
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

const FileAction = ({
  icon,
  label,
  onClick,
  href,
  download,
  loading,
}: {
  icon: string
  label: string
  onClick?: () => void
  href?: string
  download?: string
  loading?: number | boolean
}) => {
  if (href) {
    return (
      <a
        href={href}
        download={download}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-white"
      >
        <Icon name={icon as any} className="text-[16px]" />
        <span>{label}</span>
      </a>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={!!loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-white disabled:opacity-50"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      ) : (
        <Icon name={icon as any} className="text-[16px]" />
      )}
      <span>{label}</span>
    </button>
  )
}

const Upload = ({ type, files, route, segment }: { type: FileType; files: Files; route: Route; segment: number }) => {
  const [isLoading, setIsLoading] = useState(false)
  const totalSegments = route.maxqlog + 1

  const disabled =
    segment === -1 ? files[type].length === totalSegments : !!files[type].find((x) => x.includes(`/${segment}/${FILE_INFO[type].name}`))
  if (disabled) return null
  return (
    <FileAction
      label="Upload"
      icon="upload"
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
  const { dongleId, date, routeName } = useRouteParams()
  const [progress, setProgress] = useState<Record<number, number>>({})
  const totalSegments = route.maxqlog + 1

  const values = Object.values(progress)
  const loading = values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined
  if (files[type].length !== totalSegments) return null

  if (type === 'logs' || type === 'qlogs')
    return <FileAction label={FILE_INFO[type].processed || 'View'} icon="open_in_new" href={`/${dongleId}/${date}/${type}`} />

  if (type === 'qcameras') return null

  return (
    <FileAction
      label={FILE_INFO[type].processed || 'Download'}
      icon="movie"
      loading={loading}
      onClick={async () => {
        setProgress({})

        const bins = await Promise.all(
          files[type].map((file, i) => downloadFile(file, ({ percent }) => setProgress((old) => ({ ...old, [i]: percent })))),
        )
        const bin = concatBins(bins)
        const blob = await hevcToMp4(bin, () => {})
        saveFile(blob, `${routeName}--${FILE_INFO[type].name.replace('.hevc', '.mp4')}`)
      }}
    />
  )
}

const DownloadSegment = ({ type, files, segment }: { segment: number; type: FileType; files: Files }) => {
  const { routeName } = useRouteParams()
  const file = files[type].find((x) => x.includes(`/${segment}/${FILE_INFO[type].name}`))
  if (!file) return null
  return <FileAction label={FILE_INFO[type].raw} icon="raw_on" href={file} download={`${routeName}--${segment}--${FILE_INFO[type].name}`} />
}

const ProcessSegment = ({ type, files, segment }: { segment: number; type: FileType; files: Files }) => {
  const { dongleId, date, routeName } = useRouteParams()
  const file = files[type].find((x) => x.includes(`/${segment}/${FILE_INFO[type].name}`))
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

const SegmentDetails = ({ segment, files, route }: { segment: number; files: Files; route: Route }) => {
  const isRoute = segment === -1

  return (
    <div className="flex flex-col gap-2">
      {FileType.options.map((type) => {
        return (
          <div key={`${type}-${segment}`} className="flex flex-col gap-2 py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">{FILE_INFO[type].label}</span>
              <div className="flex gap-2 items-center">
                {isRoute ? (
                  <FullRouteDownload type={type} files={files} route={route} />
                ) : (
                  <>
                    <DownloadSegment type={type} files={files} segment={segment} />
                    <ProcessSegment type={type} files={files} segment={segment} />
                  </>
                )}
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

  const getStatusColor = (status: string) => {
    if (status === 'full') return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (status === 'partial') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-white/5 text-white/40 border-white/10'
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      <button
        className={clsx(
          'h-8 px-3 flex items-center justify-center rounded-lg text-xs font-bold border transition-all',
          getStatusColor(allStatus),
          selectedSegment === -1 && 'ring-2 ring-white border-transparent bg-white text-black',
        )}
        onClick={() => onSelect(-1)}
      >
        All
      </button>

      {Array.from({ length: totalSegments }).map((_, i) => {
        let count = 0
        for (const type of FileType.options) {
          const key = [dongleId, routeId, i, FILE_INFO[type].name].join('/')
          if (files[type].find((path) => path.includes(key))) count++
        }
        const status = count === FileType.options.length ? 'full' : count > 0 ? 'partial' : 'empty'

        return (
          <button
            key={i}
            className={clsx(
              'h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-all',
              getStatusColor(status),
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
  const [files] = useFiles(route.fullname)
  const totalSegments = route.maxqlog + 1
  const [segment, setSegment] = useState<number>(-1) // ROUTE= -1

  return (
    <div className={clsx('flex flex-col gap-4 bg-background-alt rounded-xl p-4', className)}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Files</h3>
      {files && (
        <>
          <SegmentGrid totalSegments={totalSegments} files={files} route={route} selectedSegment={segment} onSelect={setSegment} />

          <SegmentDetails segment={segment} files={files} route={route} />
        </>
      )}
    </div>
  )
}
