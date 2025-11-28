import { api } from '../src/api'
import { RouteSegment } from '../src/types'

export const WIDTH = 1928
export const HEIGHT = 1208
export const FPS = 20

export const getRouteDuration = (segment: RouteSegment) => (segment.end_time_utc_millis - segment.start_time_utc_millis) / 1000

export const getRouteSegment = async (routeName: string) => {
  const [dongleId] = routeName.split('/')
  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  return segments.body[0]
}
