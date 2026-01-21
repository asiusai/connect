import { asc, and, eq } from 'drizzle-orm'
import { Permission, Route, RouteSegment } from '../shared/types'
import { db } from './db/client'
import { routesTable } from './db/schema'
import { env } from './env'
import { sign } from './common'

export type RouteSignature = { key: string; permission: Permission }
export const createRouteSignature = (dongleId: string, routeId: string, permission: Permission, expiresIn?: number) =>
  sign({ key: `${dongleId}/${routeId}`, permission }, env.JWT_SECRET, expiresIn)

export type DataSignature = { key: string; permission: Permission }
export const createDataSignature = (key: string, permission: Permission, expiresIn?: number) =>
  sign<DataSignature>({ key, permission }, env.JWT_SECRET, expiresIn)

export type AggregatedRoute = Route & {
  route_id: string
  is_preserved: boolean
  segment_start_times: number[]
  segment_end_times: number[]
}

export const aggregateRoute = async (dongleId: string, routeId: string, origin: string): Promise<AggregatedRoute | null> => {
  const route = await db.query.routesTable.findFirst({
    where: and(eq(routesTable.dongle_id, dongleId), eq(routesTable.route_id, routeId)),
    with: { segments: { orderBy: (s) => asc(s.segment) } },
  })

  const segments = route?.segments ?? []
  if (segments.length === 0) return null

  // Only consider segments with time data for route duration calculation
  const segmentsWithTime = segments.filter((s) => s.start_time && s.end_time)
  if (segmentsWithTime.length === 0) return null

  const firstSeg = segmentsWithTime[0]
  const lastSeg = segmentsWithTime[segmentsWithTime.length - 1]
  const maxSegment = Math.max(...segments.map((s) => s.segment))
  const make = firstSeg.platform?.split('_')[0]?.toLowerCase() ?? null

  const sig = createDataSignature(`${dongleId}/${routeId}`, 'read_access', 24 * 60 * 60)
  const routeName = encodeURIComponent(`${dongleId}|${routeId}`)

  // Build actual segment times from database
  const segmentStartTimes = segments.map((s) => (s.start_time ? new Date(s.start_time).getTime() : 0))
  const segmentEndTimes = segments.map((s) => (s.end_time ? new Date(s.end_time).getTime() : 0))

  return {
    route_id: routeId,
    dongle_id: dongleId,
    fullname: `${dongleId}|${routeId}`,
    create_time: firstSeg.create_time,
    start_time: firstSeg.start_time ? new Date(firstSeg.start_time).toISOString() : null,
    end_time: lastSeg.end_time ? new Date(lastSeg.end_time).toISOString() : null,
    start_lat: firstSeg.start_lat,
    start_lng: firstSeg.start_lng,
    end_lat: lastSeg.end_lat,
    end_lng: lastSeg.end_lng,
    distance: segments.reduce((sum, s) => sum + (s.distance ?? 0), 0) || null,
    version: firstSeg.version,
    git_branch: firstSeg.git_branch,
    git_commit: firstSeg.git_commit,
    git_commit_date: firstSeg.git_commit_date,
    git_dirty: firstSeg.git_dirty,
    git_remote: firstSeg.git_remote,
    platform: firstSeg.platform,
    vin: firstSeg.vin,
    maxqlog: maxSegment,
    procqlog: maxSegment,
    is_public: route?.is_public ?? false,
    is_preserved: route?.is_preserved ?? false,
    url: `${origin}/v1/route/${routeName}/derived/${sig}`,
    user_id: null,
    make,
    id: null,
    car_id: null,
    version_id: null,
    segment_start_times: segmentStartTimes,
    segment_end_times: segmentEndTimes,
  }
}

export const routeToSegment = (route: AggregatedRoute): RouteSegment => {
  const startTime = route.start_time ? new Date(route.start_time).getTime() : route.create_time
  const endTime = route.end_time ? new Date(route.end_time).getTime() : startTime
  const segmentCount = Math.max(1, route.maxqlog + 1)

  const segmentNumbers = Array.from({ length: segmentCount }, (_, i) => i)

  const exp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const sig = createDataSignature(`${route.dongle_id}/${route.route_id}`, 'read_access', 24 * 60 * 60)

  return {
    create_time: route.create_time,
    dongle_id: route.dongle_id,
    end_lat: route.end_lat,
    end_lng: route.end_lng,
    end_time: route.end_time,
    fullname: route.fullname,
    git_branch: route.git_branch,
    git_commit: route.git_commit,
    git_commit_date: route.git_commit_date,
    git_dirty: route.git_dirty,
    git_remote: route.git_remote,
    is_public: route.is_public,
    distance: route.distance,
    maxqlog: route.maxqlog,
    platform: route.platform,
    procqlog: route.procqlog,
    start_lat: route.start_lat,
    start_lng: route.start_lng,
    start_time: route.start_time,
    url: route.url,
    user_id: route.user_id,
    version: route.version,
    vin: route.vin,
    make: route.make,
    id: route.id,
    car_id: route.car_id,
    version_id: route.version_id,
    end_time_utc_millis: endTime,
    is_preserved: route.is_preserved,
    segment_end_times: route.segment_end_times,
    segment_numbers: segmentNumbers,
    segment_start_times: route.segment_start_times,
    share_exp: exp,
    share_sig: sig,
    start_time_utc_millis: startTime,
  }
}
