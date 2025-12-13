import { AbsoluteFill, CalculateMetadataFunction, Sequence, Series } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { FileType, PreviewData, PreviewFiles, PreviewGenerated, PreviewProps, UnitFormat } from '../src/types'
import { api } from '../src/api'
import { HevcVideo } from './HevcVideo'
import { HlsVideo } from './HlsVideo'
import { OpenpilotUI } from './OpenpilotUI'
import { Loading } from '../src/components/Loading'
import clsx from 'clsx'
import { FrameData, readLogs } from '../log-reader/reader'
import { getRouteDurationMs } from '../src/utils/format'
import { toSegmentFiles } from '../src/utils/helpers'
import { Icon } from '../src/components/Icon'

export const getPreviewData = async (props: PreviewProps): Promise<PreviewData> => {
  const [dongleId] = props.routeName.split('/')
  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: props.routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const route = segments.body[0]

  const res = await api.file.files.query({ params: { routeName: props.routeName.replace('/', '|') } })
  if (res.status !== 200) throw new Error()
  let files = toSegmentFiles(res.body, route.maxqlog + 1)
  return { route, files }
}

export const getPreviewGenerated = async (props: PreviewProps): Promise<PreviewGenerated | undefined> => {
  if (!props.data) return

  const start = props.startSegment ?? 0
  const end = props.segmentCount ? start + props.segmentCount : props.data.files.length

  // only use the files if all are uploaded
  const getFiles = (preffered?: FileType, fallback?: FileType) => {
    const type = !preffered ? undefined : props.data!.files[preffered].every(Boolean) ? preffered : fallback
    if (!type) return
    return { type, files: props.data!.files[type].slice(start, end) }
  }

  const largeCameraFiles = getFiles(props.largeCameraType, 'qcameras')!
  const smallCameraFiles = getFiles(props.smallCameraType)
  const logFiles = getFiles(props.logType)

  const prefetchedLogs =
    logFiles && props.prefetchLogs ? await Promise.all(logFiles.files.map((url) => (url ? readLogs({ url }) : undefined))) : undefined

  const totalDuration = getRouteDurationMs(props.data.route)! / 1000
  const lastSegmentDuration = end === props.data.route.maxqlog + 1 ? totalDuration % 60 : 60
  const duration = (end - start - 1) * 60 + lastSegmentDuration

  return { duration, largeCameraFiles, logFiles, prefetchedLogs, smallCameraFiles }
}

export const previewCalculateMetadata: CalculateMetadataFunction<PreviewProps> = async ({ props }) => {
  if (!props.data) props.data = await getPreviewData(props)
  if (!props.generated) props.generated = await getPreviewGenerated(props)

  return {
    durationInFrames: props.generated!.duration * FPS,
    props: props,
  }
}

const Camera = ({ className, files, name }: { name: string; files?: PreviewFiles; className?: string }) => {
  if (!files) return null
  return (
    <div className={clsx('absolute', className)} style={{ aspectRatio: WIDTH / HEIGHT }}>
      <Loading className="absolute inset-0" />
      <div className="relative h-full w-full">
        {files.type === 'qcameras' && <HlsVideo files={files} />}
        {files.files.map((src, i) => (
          <Sequence
            key={src}
            from={i * 60 * FPS}
            name={`${name} ${i}`}
            durationInFrames={60 * FPS}
            premountFor={60 * FPS}
            postmountFor={60 * FPS}
          >
            {files.type !== 'qcameras' && src && <HevcVideo src={src} />}
            {!src && (
              <AbsoluteFill className="bg-black/50 items-center justify-center text-4xl gap-4">
                <Icon name="info" className="text-6xl" />
                <div>This video segment has not uploaded yet or has been deleted.</div>
              </AbsoluteFill>
            )}
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
  unitFormat,
}: {
  files?: PreviewFiles
  routeName: string
  prefetchedLogs?: (Record<string, FrameData> | undefined)[]
  showPath: boolean
  unitFormat?: UnitFormat
}) => {
  if (!files) return null
  return (
    <Series>
      {files.files.map((url, i) => (
        <Series.Sequence key={i} name={`UI ${i}`} durationInFrames={60 * FPS} premountFor={60 * FPS} postmountFor={60 * FPS}>
          {url && (
            <OpenpilotUI
              i={i}
              unitFormat={unitFormat}
              routeName={routeName}
              url={url}
              prefetchedFrames={prefetchedLogs?.[i]}
              showPath={showPath}
            />
          )}
        </Series.Sequence>
      ))}
    </Series>
  )
}

export const Preview = ({ generated, routeName, showPath, unitFormat }: PreviewProps) => {
  if (!generated) return null
  return (
    <AbsoluteFill>
      <Camera files={generated.largeCameraFiles} name="Large" className="inset-0" />
      <UI
        files={generated.logFiles}
        routeName={routeName}
        prefetchedLogs={generated.prefetchedLogs}
        showPath={!!showPath}
        unitFormat={unitFormat}
      />
      <Camera
        files={generated.smallCameraFiles}
        name="Small"
        className="h-[400px] bottom-[30px] right-[30px] rounded-[20px] w-auto overflow-hidden"
      />
    </AbsoluteFill>
  )
}
