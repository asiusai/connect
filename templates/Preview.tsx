import { AbsoluteFill, CalculateMetadataFunction, Sequence, Series } from 'remotion'
import { z } from 'zod'
import { FPS, getRouteDuration, getRouteSegment, HEIGHT, WIDTH } from './shared'
import { createQCameraStreamUrl } from '../src/utils/helpers'
import { Files, RouteSegment } from '../src/types'
import { api } from '../src/api'
import { HevcVideo } from './HevcVideo'
import { HlsVideo } from './HlsVideo'
import { DrivingPath } from './DrivingPath'
import { Loading } from '../src/components/material/Loading'
import clsx from 'clsx'
import { readLogs } from '../log-reader/reader'

export const CameraType = z.enum(['cameras', 'ecameras', 'dcameras', 'qcameras'])
export type CameraType = z.infer<typeof CameraType>

export const LogType = z.enum(['qlogs', 'logs'])
export type LogType = z.infer<typeof LogType>

export const FrameData = z.any()
export const PreviewData = z.object({
  segment: RouteSegment,
  qCameraUrl: z.string().optional(),
  files: Files,
  logData: z.record(FrameData).array().optional(),
})
export type PreviewData = z.infer<typeof PreviewData>
export const PreviewProps = z.object({
  routeName: z.string(),
  largeCamera: CameraType,
  smallCamera: CameraType.optional(),
  logType: LogType.optional(),
  data: PreviewData.optional(),
})
export type PreviewProps = z.infer<typeof PreviewProps>

export const getPreviewData = async (props: PreviewProps): Promise<PreviewData> => {
  const segment = await getRouteSegment(props.routeName)
  const qCameraUrl = createQCameraStreamUrl(props.routeName, { exp: segment.share_exp, sig: segment.share_sig })

  const files = await api.file.files.query({ params: { routeName: props.routeName.replace('/', '%7C') } })

  if (files.status !== 200) throw new Error()
  const logData = props.logType
    ? await Promise.all(files.body[props.logType].map((url) => readLogs({ logType: props.logType!, url })))
    : undefined
  return { segment, files: files.body, qCameraUrl, logData }
}

export const previewCalculateMetadata: CalculateMetadataFunction<PreviewProps> = async ({ props }) => {
  const data = props.data ?? (await getPreviewData(props))

  const duration = getRouteDuration(data.segment)

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
        {camera === 'qcameras' ? (
          <HlsVideo src={data.qCameraUrl} />
        ) : (
          data.files?.[camera].map((src, i) => (
            <Sequence key={src} from={i * 60 * FPS} name={`${name} ${i}`} durationInFrames={60 * FPS} premountFor={60 * FPS}>
              <HevcVideo src={src} />
            </Sequence>
          ))
        )}
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
