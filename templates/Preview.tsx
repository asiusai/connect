import { AbsoluteFill, CalculateMetadataFunction, Sequence, Series } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { FileType, PreviewData, PreviewGenerated, PreviewProps } from '../src/types'
import { api } from '../src/api'
import { HevcVideo } from './HevcVideo'
import { HlsVideo } from './HlsVideo'
import { OpenpilotUI } from './OpenpilotUI'
import { Loading } from '../src/components/Loading'
import clsx from 'clsx'
import { FrameData, readLogs } from '../log-reader/reader'
import { getRouteDuration } from '../src/utils/format'

export const getPreviewData = async (props: PreviewProps): Promise<PreviewData> => {
  const [dongleId] = props.routeName.split('/')
  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: props.routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const route = segments.body[0]

  const res = await api.file.files.query({ params: { routeName: props.routeName.replace('/', '%7C') } })
  if (res.status !== 200) throw new Error()
  let files = res.body
  return { route, files }
}

export const getPreviewGenerated = async (props: PreviewProps): Promise<PreviewGenerated | undefined> => {
  if (!props.data) return undefined

  const start = props.startSegment ?? 0
  const end = props.segmentCount ? start + props.segmentCount : props.data.route.maxqlog + 1

  const max = props.data.route.maxqlog + 1
  const getFiles = (type?: FileType, fallback?: FileType) => {
    if (!type || !props.data) return undefined

    let files = props.data.files[type]
    // only use the files if all are uploaded
    if (files.length === max) return files

    return fallback ? props.data.files[fallback] : undefined
  }
  let largeCameraFiles = getFiles(props.largeCameraType, 'qcameras')!.slice(start, end)
  let smallCameraFiles = getFiles(props.smallCameraType)?.slice(start, end)
  let logFiles = getFiles(props.logType)?.slice(start, end)

  const prefetchedLogData = logFiles && props.prefetchLogs ? await Promise.all(logFiles.map((url) => readLogs({ url }))) : undefined

  const totalDuration = getRouteDuration(props.data.route)! / 1000
  const lastSegmentDuration = end === props.data.route.maxqlog + 1 ? totalDuration % 60 : 60
  const duration = (end - start - 1) * 60 + lastSegmentDuration

  return { duration, largeCameraFiles, logFiles, prefetchedLogs: prefetchedLogData, smallCameraFiles }
}

export const previewCalculateMetadata: CalculateMetadataFunction<PreviewProps> = async ({ props }) => {
  if (!props.data) props.data = await getPreviewData(props)
  if (!props.generated) props.generated = await getPreviewGenerated(props)

  return {
    durationInFrames: props.generated!.duration * FPS,
    props: props,
  }
}

const Camera = ({ className, files, name }: { name: string; files?: string[]; className?: string }) => {
  if (!files) return null
  return (
    <div className={clsx('absolute', className)} style={{ aspectRatio: WIDTH / HEIGHT }}>
      <Loading className="absolute inset-0" />
      <div className="relative h-full w-full">
        {files.map((src, i) => (
          <Sequence
            key={src}
            from={i * 60 * FPS}
            name={`${name} ${i}`}
            durationInFrames={60 * FPS}
            premountFor={60 * FPS}
            postmountFor={60 * FPS}
          >
            {src.includes('.ts') ? <HlsVideo src={src} /> : <HevcVideo src={src} />}
          </Sequence>
        ))}
      </div>
    </div>
  )
}

const UI = ({
  files,
  routeName,
  prefetchedLogs,
  showPath,
  isImperial,
}: {
  files?: string[]
  routeName: string
  prefetchedLogs?: Record<string, FrameData>[]
  showPath: boolean
  isImperial: boolean
}) => {
  if (!files) return null
  return (
    <Series>
      {files.map((url, i) => (
        <Series.Sequence key={i} name={`UI ${i}`} durationInFrames={60 * FPS} premountFor={60 * FPS} postmountFor={60 * FPS}>
          <OpenpilotUI
            i={i}
            isImperial={isImperial}
            routeName={routeName}
            url={url}
            prefetchedFrames={prefetchedLogs?.[i]}
            showPath={showPath}
          />
        </Series.Sequence>
      ))}
    </Series>
  )
}

export const Preview = ({ generated, routeName, showPath, isImperial }: PreviewProps) => {
  if (!generated) return null
  return (
    <AbsoluteFill>
      <Camera files={generated.largeCameraFiles} name="Large" className="inset-0" />
      <UI
        files={generated.logFiles}
        routeName={routeName}
        prefetchedLogs={generated.prefetchedLogs}
        showPath={!!showPath}
        isImperial={!!isImperial}
      />
      <Camera
        files={generated.smallCameraFiles}
        name="Small"
        className="h-[400px] bottom-[30px] right-[30px] rounded-[20px] w-auto overflow-hidden"
      />
    </AbsoluteFill>
  )
}
