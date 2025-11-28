import { AbsoluteFill, CalculateMetadataFunction, Sequence, Series } from 'remotion'
import { FPS, HEIGHT, WIDTH } from './shared'
import { CameraType, LogType, PreviewData, PreviewProps } from '../src/types'
import { api } from '../src/api'
import { HevcVideo } from './HevcVideo'
import { HlsVideo } from './HlsVideo'
import { DrivingPath } from './DrivingPath'
import { Loading } from '../src/components/material/Loading'
import clsx from 'clsx'
import { readLogs } from '../log-reader/reader'
import { getRouteDuration } from '../src/utils/format'

export const getPreviewData = async (props: PreviewProps): Promise<PreviewData> => {
  const [dongleId] = props.routeName.split('/')
  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: props.routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const route = segments.body[0]

  const files = await api.file.files.query({ params: { routeName: props.routeName.replace('/', '%7C') } })

  if (files.status !== 200) throw new Error()
  const logData = props.logType ? await Promise.all(files.body[props.logType].map((url) => readLogs({ url }))) : undefined
  return { route, files: files.body, logData }
}

export const previewCalculateMetadata: CalculateMetadataFunction<PreviewProps> = async ({ props }) => {
  const data = props.data ?? (await getPreviewData(props))

  const duration = getRouteDuration(data.route)!.asSeconds()

  return {
    durationInFrames: duration * FPS,
    props: { ...props, data },
  }
}

const Camera = ({ className, data, camera, name }: { name: string; data: PreviewData; camera: CameraType; className?: string }) => {
  return (
    <div className={clsx('absolute', className)} style={{ aspectRatio: WIDTH / HEIGHT }}>
      <Loading className="absolute inset-0" />
      <div className="relative h-full w-full">
        {data.files?.[camera].map((src, i) => (
          <Sequence key={src} from={i * 60 * FPS} name={`${name} ${i}`} durationInFrames={60 * FPS} premountFor={60 * FPS}>
            {camera === 'qcameras' ? <HlsVideo src={src} /> : <HevcVideo src={src} />}
          </Sequence>
        ))}
      </div>
    </div>
  )
}

const UI = ({ data, logType, routeName }: { data: PreviewData; logType: LogType; routeName: string }) => {
  return (
    <Series>
      {data.files?.[logType].map((url, i) => (
        <Series.Sequence key={i} name={`UI ${i}`} durationInFrames={60 * FPS} premountFor={60 * FPS}>
          <DrivingPath i={i} logType={logType} routeName={routeName} url={url} frames={data.logData?.[i]} />
        </Series.Sequence>
      ))}
    </Series>
  )
}

export const Preview = ({ data, largeCamera, smallCamera, routeName, logType }: PreviewProps) => {
  if (!data) return null
  return (
    <AbsoluteFill>
      <Camera data={data} camera={largeCamera} name="Large" className="inset-0" />
      {logType && <UI data={data} routeName={routeName} logType={logType} />}
      {smallCamera && (
        <Camera
          data={data}
          camera={smallCamera}
          name="Small"
          className="h-[400px] bottom-[30px] right-[30px] rounded-[20px] w-auto overflow-hidden"
        />
      )}
    </AbsoluteFill>
  )
}
