import { AbsoluteFill, CalculateMetadataFunction, Series, useCurrentFrame } from 'remotion'
import { z } from 'zod'
import { api } from '../api'
import { Files, RouteSegment } from '../api/types'
import { createQCameraStreamUrl } from '../api/route'
import { OPVideo } from './HevcVideo'
import { FPS } from './consts'
import { DB } from './indexedDb'
import { createContext, useContext, useEffect } from 'react'

export const CameraType = z.enum(['road', 'wide', 'driver'])
export type CameraType = z.infer<typeof CameraType>

const EventUnion = z.object({
  data: z.object({ event_type: z.string(), value: z.boolean().optional() }),
  offset_millis: z.number(),
  route_offset_millis: z.number(),
  time: z.number(),
  type: z.literal('event'),
})
const StateUnion = z.object({
  data: z.object({ state: z.string(), enabled: z.boolean(), alertStatus: z.number() }),
  offset_millis: z.number(),
  route_offset_millis: z.number(),
  time: z.number(),
  type: z.literal('state'),
})
const Event = z.discriminatedUnion('type', [EventUnion, StateUnion])
type Event = z.infer<typeof Event>
export const Coord = z.object({
  t: z.number(),
  lat: z.number(),
  lng: z.number(),
  speed: z.number(),
  dist: z.number(),
})
export type Coord = z.infer<typeof Coord>
export const Data = z.object({
  segments: RouteSegment.array(),
  segment: RouteSegment,
  qCamUrl: z.string(),
  files: Files,
  duration: z.number(),
  events: Event.array(),
  coords: Coord.array(),
})
export type Data = z.infer<typeof Data>

const Position = z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
export const Style = z.object({
  startFrom: z.number().optional(),
  endFrom: z.number().optional(),
  playbackSpeed: z.number(),

  largeCamera: CameraType,

  smallCamera: CameraType.optional(),
  smallCameraPosition: Position,
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
  disableCache: z.boolean(),
})
export type MainProps = z.infer<typeof MainProps>

export const getData = async (routeName: string) => {
  const [dongleId] = routeName.split('/')
  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const segment = segments.body[0]

  const duration = (segment.end_time_utc_millis - segment.start_time_utc_millis) / 1000
  const qCamUrl = createQCameraStreamUrl(routeName.replace('/', '%7C'), { exp: segment.share_exp, sig: segment.share_sig })
  const files = await api.file.files.query({ params: { routeName: routeName.replace('/', '%7C') } })
  if (files.status !== 200) throw new Error('Failed getting files!')

  const events = await Promise.all(segment.segment_numbers.map((i) => fetch(`${segment.url}/${i}/events.json`).then((x) => x.json())))
  const coords = await Promise.all(segment.segment_numbers.map((i) => fetch(`${segment.url}/${i}/coords.json`).then((x) => x.json())))

  return {
    segments: segments.body,
    segment,
    files: files.body,
    qCamUrl,
    duration,
    events: events.flat(),
    coords: coords.flat(),
  }
}

export const calculateMetadata: CalculateMetadataFunction<MainProps> = async ({ props }) => {
  const db = await new DB().init()
  const cached = await db.get<string>(props.routeName)
  let data: Data | undefined

  if (props.data) data = props.data
  else if (!props.routeName) data = undefined
  else if (cached && !props.disableCache) data = JSON.parse(cached)
  else {
    data = await getData(props.routeName)
    await db.set(props.routeName, JSON.stringify(data))
  }

  return {
    durationInFrames: data ? data.duration * FPS : 100,
    props: { ...props, data },
  }
}

export const CAMERAS = {
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
  const files = data.files[CAMERAS[style.largeCamera]]
  return (
    <Series>
      {files.map((src, i) => {
        const name = `${style.largeCamera} ${i + 1}/${files.length}`
        return (
          <Series.Sequence key={src} durationInFrames={60 * FPS} premountFor={60 * FPS} name={name}>
            <OPVideo name={name} src={src} style={{ width: '100%', background: 'white' }} />
          </Series.Sequence>
        )
      })}
    </Series>
  )
}

const SmallCamera = () => {
  const { data, style } = useVideoContext()
  if (!style.smallCamera) return null

  const files = data.files[CAMERAS[style.smallCamera]]
  return (
    <Series>
      {files.map((src, i) => {
        const name = `${style.smallCamera} ${i + 1}/${files.length}`
        return (
          <Series.Sequence key={src} name={name} durationInFrames={60 * FPS} premountFor={60 * FPS}>
            <OPVideo
              name={name}
              src={src}
              style={{
                position: 'absolute',
                ...CAMERA_POSITION[style.smallCameraPosition],
                width: `${style.smallCameraSize}%`,
                background: 'white',
              }}
            />
          </Series.Sequence>
        )
      })}
    </Series>
  )
}

const Engaged = () => {
  const frame = useCurrentFrame()
  const { data, style } = useVideoContext()
  const millis = (frame / FPS) * 1000
  let isEnabled = false
  for (const event of data.events.filter((x) => x.type === 'state')) {
    if (millis < event.route_offset_millis) continue
    isEnabled = event.data.enabled
  }
  return <div style={{ background: isEnabled ? 'green' : 'red', height: 100, width: 100, borderRadius: '100%' }}></div>
}

const CoordsMap = () => {
  const frame = useCurrentFrame()
  const { data, style } = useVideoContext()

  let coord: Coord | undefined
  for (const c of data.coords) {
    if (frame / FPS < c.t) continue
    coord = c
  }

  if (!coord) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        height: 200,
        width: 200,
        borderRadius: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translateX(-50%)',
        fontSize: 100,
        background: 'blue',
      }}
    >
      {(coord.speed * 1.60934 * 2).toFixed()}
    </div>
  )
}

export const Main = ({ data, style, routeName }: MainProps) => {
  if (!data) {
    if (routeName) return <p>Loading...</p>
    else return <p>Please insert routeName!</p>
  }
  return (
    <VideoContext value={{ data, style }}>
      <AbsoluteFill style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', fontSize: 50 }}>
        <LargeCamera />
        <SmallCamera />
        <AbsoluteFill>
          <Engaged />
          <CoordsMap />
        </AbsoluteFill>
      </AbsoluteFill>
    </VideoContext>
  )
}
