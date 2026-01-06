import { LogReader } from '../../connect/src/log-reader'

type ParamEntry = {
  Key?: string
  Value?: string
}

type InitData = {
  Version?: string
  GitCommit?: string
  GitBranch?: string
  GitRemote?: string
  Dirty?: boolean
  DongleId?: string
  Params?: { Entries?: ParamEntry[] }
}

type GpsLocation = {
  Latitude?: number
  Longitude?: number
  Speed?: number
  UnixTimestampMillis?: string
  HasFix?: boolean
}

type SelfdriveState = {
  State?: number
  Enabled?: boolean
  AlertStatus?: number
}

const SELFDRIVE_STATE_NAMES = ['disabled', 'preEnabled', 'enabled', 'softDisabling', 'overriding']

type RoadCameraState = {
  FrameId?: number
  TimestampEof?: string
}

export type RouteEvent = {
  type: 'event' | 'state' | 'user_flag'
  time: number
  offset_millis: number
  route_offset_millis: number
  data: { event_type: string; value?: boolean } | { state: string; enabled: boolean; alertStatus: number } | Record<string, never>
}

export type Coord = {
  t: number
  lat: number
  lng: number
  speed: number
  dist: number
}

export type RouteMetadata = {
  dongleId: string
  routeId: string
  version?: string
  gitCommit?: string
  gitBranch?: string
  gitRemote?: string
  gitDirty?: boolean
  startLat?: number
  startLng?: number
  startTime?: string
  endLat?: number
  endLng?: number
  endTime?: string
}

export type SegmentQlogData = {
  events: RouteEvent[]
  coords: Coord[]
  metadata: RouteMetadata | null
  firstGps: GpsLocation | null
  lastGps: GpsLocation | null
}


export const processQlogStream = async (
  stream: ReadableStream<Uint8Array>,
  segment: number,
  dongleId?: string,
  routeId?: string
): Promise<SegmentQlogData | null> => {
  const events: RouteEvent[] = []
  const coords: Coord[] = []
  const metadata: RouteMetadata = { dongleId: dongleId ?? '', routeId: routeId ?? '' }

  let firstGps: GpsLocation | null = null
  let lastGps: GpsLocation | null = null
  let routeStartTime: number | null = null
  let lastState: string | null = null
  let totalDist = 0
  let lastCoord: Coord | null = null

  // For derived events
  let recordFrontValue: boolean | null = null
  let firstPandaStatesTime: number | null = null
  let firstRoadCameraFrameTime: number | null = null

  try {
    for await (const event of LogReader(stream)) {
      const logMonoTime = Number(event.LogMonoTime || 0)
      if (routeStartTime === null && logMonoTime > 0) routeStartTime = logMonoTime

      // Extract init data
      if ('InitData' in event) {
        const init = event.InitData as InitData

        // Only extract metadata from segment 0
        if (segment === 0) {
          metadata.version = init.Version
          metadata.gitCommit = init.GitCommit
          metadata.gitBranch = init.GitBranch
          metadata.gitRemote = init.GitRemote
          metadata.gitDirty = init.Dirty
        }

        // Check for RecordFront param (each segment has its own InitData)
        if (init.Params?.Entries) {
          const recordFrontParam = init.Params.Entries.find((e) => e.Key === 'RecordFront')
          if (recordFrontParam) {
            recordFrontValue = recordFrontParam.Value === '1'
          }
        }
      }

      // Track first PandaStates time for record_front_toggle event
      if ('PandaStates' in event && firstPandaStatesTime === null) {
        firstPandaStatesTime = logMonoTime
      }

      // Track first road camera frame in this segment
      if ('RoadCameraState' in event && firstRoadCameraFrameTime === null) {
        const cam = event.RoadCameraState as RoadCameraState
        if (cam.TimestampEof) {
          firstRoadCameraFrameTime = Number(cam.TimestampEof)
        }
      }

      // Extract GPS coordinates (only with valid fix)
      if ('GpsLocationExternal' in event || 'GpsLocation' in event) {
        const gps = (event.GpsLocationExternal || event.GpsLocation) as GpsLocation
        if (gps.HasFix && gps.Latitude && gps.Longitude && gps.UnixTimestampMillis) {
          if (!firstGps) firstGps = gps
          lastGps = gps

          const t = Math.floor(Number(gps.UnixTimestampMillis) / 1000)
          const lat = gps.Latitude
          const lng = gps.Longitude
          const speed = gps.Speed || 0

          // Calculate distance using speed (matches comma API behavior)
          if (lastCoord) {
            const dt = t - lastCoord.t
            totalDist += (speed * dt) / 1000 // speed is m/s, convert to km
          }

          const coord: Coord = { t, lat, lng, speed, dist: Math.round(totalDist * 1e6) / 1e6 }
          coords.push(coord)
          lastCoord = coord
        }
      }

      // Extract selfdrive state changes (state, enabled, or alertStatus)
      if ('SelfdriveState' in event) {
        const ss = event.SelfdriveState as SelfdriveState
        const state = SELFDRIVE_STATE_NAMES[ss.State ?? 0] || 'disabled'
        const enabled = ss.Enabled ?? false
        const alertStatus = ss.AlertStatus ?? 0
        const stateKey = `${state}|${enabled}|${alertStatus}`
        if (stateKey !== lastState) {
          lastState = stateKey
          const offsetMillis = routeStartTime ? Math.floor((logMonoTime - routeStartTime) / 1e6) : 0
          events.push({
            type: 'state',
            time: logMonoTime,
            offset_millis: offsetMillis,
            route_offset_millis: offsetMillis + segment * 60000,
            data: { state, enabled, alertStatus },
          })
        }
      }

      // Extract user flags
      if ('UserFlag' in event) {
        const offsetMillis = routeStartTime ? Math.floor((logMonoTime - routeStartTime) / 1e6) : 0
        events.push({
          type: 'user_flag',
          time: logMonoTime,
          offset_millis: offsetMillis,
          route_offset_millis: offsetMillis + segment * 60000,
          data: {},
        })
      }
    }

    // Add derived events
    const derivedEvents: RouteEvent[] = []

    // record_front_toggle event - emitted for each segment that has RecordFront in InitData
    if (recordFrontValue !== null && firstPandaStatesTime !== null && routeStartTime !== null) {
      const offsetMillis = Math.floor((firstPandaStatesTime - routeStartTime) / 1e6)
      derivedEvents.push({
        type: 'event',
        time: firstPandaStatesTime,
        offset_millis: offsetMillis,
        route_offset_millis: offsetMillis + segment * 60000,
        data: { event_type: 'record_front_toggle', value: recordFrontValue },
      })
    }

    // first_road_camera_frame event - emitted for each segment
    if (firstRoadCameraFrameTime !== null && routeStartTime !== null) {
      const offsetMillis = Math.floor((firstRoadCameraFrameTime - routeStartTime) / 1e6)
      derivedEvents.push({
        type: 'event',
        time: firstRoadCameraFrameTime,
        offset_millis: offsetMillis,
        route_offset_millis: offsetMillis + segment * 60000,
        data: { event_type: 'first_road_camera_frame' },
      })
    }

    // Combine and sort all events by time
    const allEvents = [...derivedEvents, ...events].sort((a, b) => a.time - b.time)

    return { events: allEvents, coords, metadata: segment === 0 ? metadata : null, firstGps, lastGps }
  } catch (e) {
    console.error(`Failed to parse qlog:`, e)
    return null
  }
}
