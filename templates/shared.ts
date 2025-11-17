import { api } from '../src/api'
import { Coord, Files, RouteEvent, RouteSegment } from '../src/types'
import { z } from 'zod'
import { createQCameraStreamUrl } from '../src/utils/helpers'

export const WIDTH = 1928
export const HEIGHT = 1208
export const FPS = 20

export const Position = z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
export type Position = z.infer<typeof Position>
export const CAMERA_POSITION = {
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
  none: { display: 'hidden' },
}
export const CAMERAS = {
  road: 'cameras',
  wide: 'ecameras',
  driver: 'dcameras',
} as const

export const RouteData = z.object({
  segment: RouteSegment,
  qCamUrl: z.string(),
  files: Files,
  duration: z.number(),
  events: RouteEvent.array(),
  coords: Coord.array(),
})
export type RouteData = z.infer<typeof RouteData>

export const getRouteDuration = (segment: RouteSegment) => (segment.end_time_utc_millis - segment.start_time_utc_millis) / 1000

export const getRouteSegment = async (routeName: string) => {
  const [dongleId] = routeName.split('/')
  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  return segments.body[0]
}

export const getPublicRouteData = async (routeName: string): Promise<RouteData> => {
  const segment = await getRouteSegment(routeName)
  const duration = getRouteDuration(segment)
  const qCamUrl = createQCameraStreamUrl(routeName, { exp: segment.share_exp, sig: segment.share_sig })
  const files = await api.file.files.query({ params: { routeName: routeName.replace('/', '%7C') } })
  if (files.status !== 200) throw new Error('Failed getting files!')

  const events = await Promise.all(segment.segment_numbers.map((i) => fetch(`${segment.url}/${i}/events.json`).then((x) => x.json())))
  const coords = await Promise.all(segment.segment_numbers.map((i) => fetch(`${segment.url}/${i}/coords.json`).then((x) => x.json())))

  return {
    segment,
    files: files.body,
    qCamUrl,
    duration,
    events: events.flat(),
    coords: coords.flat(),
  }
}
