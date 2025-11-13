import { AbsoluteFill, CalculateMetadataFunction, Html5Video, Sequence, Series } from 'remotion'
import { z } from 'zod'
import { api } from '../api'
import { Files, RouteSegment } from '../api/types'
import { createQCameraStreamUrl } from '../api/route'
import { HevcVideo } from './HevcVideo'
import { FPS } from './consts'
import { DB } from './indexedDb'
import { createContext, useContext } from 'react'

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

const Position = z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'none'])
export const Style = z.object({
  startFrom: z.number().optional(),
  endFrom: z.number().optional(),
  playbackSpeed: z.number(),

  largeCamera: CameraType,

  smallCameraPosition: Position,
  smallCamera: CameraType,
  smallCameraSize: z.number().min(0).max(100),

  mapPosition: Position,
  mapTheme: z.enum(['dark', 'light']),

  showSpeed: z.boolean(),
})

export const defaultStyle: Style = {
  playbackSpeed: 1,

  largeCamera: 'road',

  smallCameraPosition: 'bottom-right',
  smallCamera: 'driver',
  smallCameraSize: 40,

  mapPosition: 'top-right',
  mapTheme: 'dark',

  showSpeed: false,
}
const CAMERA_POSITION = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
  none: { display: 'hidden' },
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
const CAMERAS = {
  road: 'cameras',
  wide: 'ecameras',
  driver: 'dcameras',
} as const

const VideoContext = createContext<{ data: Data; style: Style } | null>(null)
const useVideoContext = () => {
  const ctx = useContext(VideoContext)
  if (!ctx) throw new Error()
  return ctx
}
const LargeCamera = () => {
  const { data, style } = useVideoContext()
  return (
    <Series>
      {data.files[CAMERAS[style.largeCamera]].map((src, i) => (
        <Series.Sequence key={src} durationInFrames={60 * FPS} premountFor={60 * FPS} name={`Road ${i + 1}/${data.files.cameras.length}`}>
          <HevcVideo src={src} style={{ width: '100%', background: 'white' }} />
        </Series.Sequence>
      ))}
    </Series>
  )
}
const SmallCamera = () => {
  const { data, style } = useVideoContext()
  if (style.smallCameraPosition === 'none') return null
  return (
    <Series>
      {data.files[CAMERAS[style.smallCamera]].map((src, i) => (
        <Series.Sequence key={src} name={`Driver ${i + 1}/${data.files.cameras.length}`} durationInFrames={60 * FPS} premountFor={60 * FPS}>
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
  )
}
export const Main = ({ data, style }: MainProps) => {
  if (!data) return <p>Loading...</p>

  return (
    <VideoContext value={{ data, style }}>
      <AbsoluteFill style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', fontSize: 50 }}>
        <LargeCamera />
        <SmallCamera />
      </AbsoluteFill>
    </VideoContext>
  )
}
