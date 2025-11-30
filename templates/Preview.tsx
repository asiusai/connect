import { AbsoluteFill, CalculateMetadataFunction, Sequence, Series } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { CameraType, LogType, PreviewData, PreviewGenerated, PreviewProps } from '../src/types'
import { api } from '../src/api'
import { HevcVideo } from './HevcVideo'
import { HlsVideo } from './HlsVideo'
import { OpenpilotUI } from './OpenpilotUI'
import { Loading } from '../src/components/material/Loading'
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

export const getPreviewGenerated = async (props: PreviewProps): Promise<PreviewGenerated> => {
  if (!props.data) throw new Error()

  const start = props.startSegment ?? 0
  const end = props.segmentCount ? start + props.segmentCount : props.data.route.maxqlog + 1

  let largeCameraFiles = props.data.files[props.largeCameraType].slice(start, end)
  let smallCameraFiles = props.smallCameraType ? props.data.files[props.smallCameraType].slice(start, end) : undefined
  let logFiles = props.logType ? props.data.files[props.logType].slice(start, end) : undefined

  const prefetchedLogData = logFiles && props.prefetchLogs ? await Promise.all(logFiles.map((url) => readLogs({ url }))) : undefined

  const totalDuration = getRouteDuration(props.data.route)!.asSeconds()
  const lastSegmentDuration = end === props.data.route.maxqlog + 1 ? totalDuration % 60 : 60
  const duration = (end - start - 1) * 60 + lastSegmentDuration

  return { duration, largeCameraFiles, logFiles, prefetchedLogs: prefetchedLogData, smallCameraFiles }
}

export const previewCalculateMetadata: CalculateMetadataFunction<PreviewProps> = async ({ props }) => {
  if (!props.data) props.data = await getPreviewData(props)
  if (!props.generated) props.generated = await getPreviewGenerated(props)

  return {
    durationInFrames: props.generated.duration * FPS,
    props: props,
  }
}

const Camera = ({ className, files, type, name }: { name: string; files?: string[]; type: CameraType; className?: string }) => {
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
            {type === 'qcameras' ? <HlsVideo src={src} /> : <HevcVideo src={src} />}
          </Sequence>
        ))}
      </div>
    </div>
  )
}

const UI = ({
  files,
  logType,
  routeName,
  prefetchedLogs,
  showPath,
}: {
  files?: string[]
  logType: LogType
  routeName: string
  prefetchedLogs?: Record<string, FrameData>[]
  showPath: boolean
}) => {
  if (!files) return null
  return (
    <Series>
      {files.map((url, i) => (
        <Series.Sequence key={i} name={`UI ${i}`} durationInFrames={60 * FPS} premountFor={60 * FPS} postmountFor={60 * FPS}>
          <OpenpilotUI i={i} logType={logType} routeName={routeName} url={url} prefetchedFrames={prefetchedLogs?.[i]} showPath={showPath} />
        </Series.Sequence>
      ))}
    </Series>
  )
}

export const Preview = ({ generated, largeCameraType, smallCameraType, routeName, logType, showPath }: PreviewProps) => {
  if (!generated) return null
  return (
    <AbsoluteFill>
      <Camera files={generated.largeCameraFiles} type={largeCameraType} name="Large" className="inset-0" />
      <UI
        files={generated.logFiles}
        routeName={routeName}
        logType={logType!}
        prefetchedLogs={generated.prefetchedLogs}
        showPath={!!showPath}
      />
      <Camera
        files={generated.smallCameraFiles}
        type={smallCameraType!}
        name="Small"
        className="h-[400px] bottom-[30px] right-[30px] rounded-[20px] w-auto overflow-hidden"
      />
    </AbsoluteFill>
  )
}
