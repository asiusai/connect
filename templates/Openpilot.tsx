import { AbsoluteFill, CalculateMetadataFunction, Series, useCurrentFrame } from 'remotion'
import { CameraType, Coord } from '../src/types'
import { HevcVideo } from './HevcVideo'
import { createContext, useContext } from 'react'
import { CAMERA_POSITION, CAMERAS, getPublicRouteData, Position, RouteData, FPS } from './shared'
import { z } from 'zod'
import { DB } from '../src/utils/db'

export const OpenpilotStyle = z.object({
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
export type OpenpilotStyle = z.infer<typeof OpenpilotStyle>
export const OpenpilotProps = z.object({
  routeName: z.string(),
  style: OpenpilotStyle,
  data: RouteData.optional(),
  disableCache: z.boolean(),
})
export type OpenpilotProps = z.infer<typeof OpenpilotProps>

export const defaultOpenpilotStyle: OpenpilotStyle = {
  playbackSpeed: 1,

  largeCamera: 'road',

  smallCameraPosition: 'bottom-right',
  smallCamera: 'driver',
  smallCameraSize: 40,

  mapPosition: 'top-right',
  mapTheme: 'dark',

  showSpeed: false,
}

export const openpilotCalculateMetadata: CalculateMetadataFunction<OpenpilotProps> = async ({ props }) => {
  const db = await new DB().init()
  const cached = await db.get<string>(props.routeName)
  let data: RouteData | undefined

  if (props.data) data = props.data
  else if (!props.routeName) data = undefined
  else if (cached && !props.disableCache) data = JSON.parse(cached)
  else {
    data = await getPublicRouteData(props.routeName)
    await db.set(props.routeName, JSON.stringify(data))
  }

  return {
    durationInFrames: data ? data.duration * FPS : 100,
    props: { ...props, data },
  }
}

const VideoContext = createContext<{ data: RouteData; style: OpenpilotStyle } | null>(null)
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
            <HevcVideo src={src} style={{ width: '100%', background: 'white' }} />
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
        )
      })}
    </Series>
  )
}

const Engaged = () => {
  const frame = useCurrentFrame()
  const { data } = useVideoContext()
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

export const Openpilot = ({ data, style, routeName }: OpenpilotProps) => {
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
