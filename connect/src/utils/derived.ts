import type { DerivedFile, Route } from '../../../shared/types'
import { getRouteDurationMs } from '../utils/format'
import { DB } from './db'
import { getRouteUrl } from '../../../shared/helpers'

type OpenpilotState = 'disabled' | 'preEnabled' | 'enabled' | 'softDisabling' | 'overriding'
type AlertStatus = 0 | 1 | 2

type DriveEvent = {
  type: string
  time: number
  offset_millis: number
  route_offset_millis: number
  data: object
} & (
  | { type: 'event'; data: { event_type: 'record_front_toggle' | 'first_road_camera_frame' } }
  | { type: 'state'; data: { state: OpenpilotState; enabled: boolean; alertStatus: AlertStatus } }
  | { type: 'user_flag'; data: Record<string, never> }
)

export type TimelineEvent = { route_offset_millis: number } & (
  | { type: 'engaged'; end_route_offset_millis: number }
  | { type: 'alert'; end_route_offset_millis: number; alertStatus: AlertStatus }
  | { type: 'overriding'; end_route_offset_millis: number }
  | { type: 'user_flag' }
)

const getDerived = async <T>(route: Route, fn: DerivedFile): Promise<T[]> => {
  if (!route) return []

  const db = await DB.init(fn)
  const saved = await db.get<T[]>(route.fullname)
  if (saved) return saved

  const results = await Promise.all(
    Array.from({ length: route.maxqlog + 1 }).map((_, i) =>
      fetch(getRouteUrl(route, i, fn))
        .then((res) => (res.ok ? (res.json() as T) : undefined))
        .catch((err) => {
          console.error('Error parsing file', err)
          return
        }),
    ),
  )

  // cache only if all files exist
  if (results.every(Boolean)) await db.set(route.fullname, results)

  return results.filter((it) => it !== undefined)
}

const getEvents = async (route: Route) => await getDerived<DriveEvent[]>(route, 'events.json').then((x) => x.flat())

export const getTimelineEvents = async (route: Route): Promise<TimelineEvent[]> => {
  const events = await getEvents(route)
  const routeDuration = getRouteDurationMs(route) ?? 0

  // sort events by timestamp
  events.sort((a, b) => a.route_offset_millis - b.route_offset_millis)

  // convert events to timeline events
  const res: TimelineEvent[] = []
  let lastEngaged: Extract<DriveEvent, { type: 'state' }> | undefined
  let lastAlert: Extract<DriveEvent, { type: 'state' }> | undefined
  let lastOverride: Extract<DriveEvent, { type: 'state' }> | undefined

  const isOverriding = (state: OpenpilotState) => ['overriding', 'preEnabled'].includes(state)

  events.forEach((ev) => {
    if (ev.type === 'user_flag') res.push({ type: 'user_flag', route_offset_millis: ev.route_offset_millis })
    else if (ev.type === 'state') {
      const { enabled, alertStatus, state } = ev.data
      if (lastEngaged && !enabled) {
        res.push({ type: 'engaged', route_offset_millis: lastEngaged.route_offset_millis, end_route_offset_millis: ev.route_offset_millis })
        lastEngaged = undefined
      }
      if (!lastEngaged && enabled) lastEngaged = ev

      if (lastAlert && lastAlert.data.alertStatus !== alertStatus) {
        res.push({
          type: 'alert',
          route_offset_millis: lastAlert.route_offset_millis,
          end_route_offset_millis: ev.route_offset_millis,
          alertStatus: lastAlert.data.alertStatus,
        })
        lastAlert = undefined
      }
      if (!lastAlert && alertStatus !== 0) lastAlert = ev

      if (lastOverride && !isOverriding(ev.data.state)) {
        res.push({
          type: 'overriding',
          route_offset_millis: lastOverride.route_offset_millis,
          end_route_offset_millis: ev.route_offset_millis,
        })
        lastOverride = undefined
      }
      if (!lastOverride && isOverriding(state)) lastOverride = ev
    }
  })

  // ensure events have an end timestamp
  if (lastEngaged) res.push({ type: 'engaged', route_offset_millis: lastEngaged.route_offset_millis, end_route_offset_millis: routeDuration })

  if (lastAlert)
    res.push({
      type: 'alert',
      route_offset_millis: lastAlert.route_offset_millis,
      end_route_offset_millis: routeDuration,
      alertStatus: lastAlert.data.alertStatus,
    })

  if (lastOverride) res.push({ type: 'overriding', route_offset_millis: lastOverride.route_offset_millis, end_route_offset_millis: routeDuration })

  return res
}

export type RouteStats = {
  engagedDurationMs: number
  userFlags: number
}

export const getRouteStats = async (timeline: TimelineEvent[]): Promise<RouteStats> => {
  let engagedDurationMs = 0
  let userFlags = 0
  timeline.forEach((ev) => {
    if (ev.type === 'engaged') engagedDurationMs += ev.end_route_offset_millis - ev.route_offset_millis
    else if (ev.type === 'user_flag') userFlags += 1
  })

  return {
    engagedDurationMs,
    userFlags,
  }
}

export type GPSPathPoint = {
  t: number
  lng: number
  lat: number
  speed: number
  dist: number
}

export const getCoords = async (route: Route) => await getDerived<GPSPathPoint[]>(route, 'coords.json').then((x) => x.flat())
