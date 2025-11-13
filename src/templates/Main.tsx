import { AbsoluteFill, CalculateMetadataFunction, Html5Video, Sequence, Series } from 'remotion'
import { z } from 'zod'
import { api } from '../api'
import { Files, RouteSegment } from '../api/types'
import { createQCameraStreamUrl } from '../api/route'
import { HevcVideo } from './HevcVideo'
import { FPS } from './consts'
import { DB } from './indexedDb'

const CameraType = z.enum(['road', 'wide', 'driver'])
type CameraType = z.infer<typeof CameraType>
const Data = z.object({
  segments: RouteSegment.array(),
  segment: RouteSegment,
  qCamUrl: z.string(),
  files: Files,
  duration: z.number(),
})
type Data = z.infer<typeof Data>

export const Style = z.object({
  largeCamera: CameraType,
  smallCamera: CameraType.optional(),
  smallCameraPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  smallCameraSize: z.number().min(0).max(100),
  startFrom: z.number().optional(),
  endFrom: z.number().optional(),
  playbackSpeed: z.number(),
  showSpeed: z.boolean(),
})

export const defaultStyle: Style = {
  largeCamera: 'road',
  smallCamera: 'driver',
  smallCameraPosition: 'bottom-right',
  smallCameraSize: 40,
  playbackSpeed: 1,
  showSpeed: false,
}
const CAMERA_POSITION = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
}

export type Style = z.infer<typeof Style>
export const MainProps = z.object({
  routeName: z.string(),
  style: Style,
  data: Data.optional(),
})
export type MainProps = z.infer<typeof MainProps>

const getData = async (routeName: string) => {
  const [dongleId] = routeName.split('/')
  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const segment = segments.body[0]

  const duration = (segment.end_time_utc_millis - segment.start_time_utc_millis) / 1000
  const qCamUrl = createQCameraStreamUrl(routeName.replace('/', '%7C'), { exp: segment.share_exp, sig: segment.share_sig })
  const files = await api.file.files.query({ params: { routeName: routeName.replace('/', '%7C') } })
  if (files.status !== 200) throw new Error('Failed getting files!')
  return {
    segments: segments.body,
    segment,
    files: files.body,
    qCamUrl,
    duration,
  }
}
export const calculateMetadata: CalculateMetadataFunction<MainProps> = async ({ props }) => {
  const db = await new DB().init()
  const stored = await db.get<string>(props.routeName)
  let data: Data
  if (stored) data = JSON.parse(stored)
  else {
    data = await getData(props.routeName)
    await db.set(props.routeName, JSON.stringify(data))
  }

  return {
    durationInFrames: data.duration * FPS,
    props: { ...props, data },
  }
}

export const Main = ({ data, style }: MainProps) => {
  if (!data) return <p>Loading...</p>
  const cameras: Record<CameraType, string[]> = {
    road: data.files.cameras,
    wide: data.files.ecameras,
    driver: data.files.dcameras,
  }
  return (
    <AbsoluteFill style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', fontSize: 50 }}>
      <Series>
        {cameras[style.largeCamera].map((src, i) => (
          <Series.Sequence key={src} durationInFrames={60 * FPS} premountFor={60 * FPS} name={`Road ${i + 1}/${data.files.cameras.length}`}>
            <HevcVideo src={src} style={{ width: '100%', background: 'white' }} />
          </Series.Sequence>
        ))}
      </Series>
      {style.smallCamera && (
        <Series>
          {cameras[style.smallCamera].map((src, i) => (
            <Series.Sequence
              layout="absolute-fill"
              key={src}
              durationInFrames={60 * FPS}
              premountFor={60 * FPS}
              name={`Driver ${i + 1}/${data.files.cameras.length}`}
            >
              <HevcVideo
                src={src}
                style={{
                  position: 'absolute',
                  ...CAMERA_POSITION[style.smallCameraPosition],
                  width: `${style.smallCameraSize}%`,
                  background: 'white',
                }}
              />
            </Series.Sequence>
          ))}
        </Series>
      )}
    </AbsoluteFill>
  )
}
