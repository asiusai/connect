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
  GitCommitDate?: string
  Dirty?: boolean
  DongleId?: string
  DeviceType?: number
  Params?: { Entries?: ParamEntry[] }
}

type CarParams = {
  CarFingerprint?: string
  CarVin?: string
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
  gitCommitDate?: string
  gitDirty?: boolean
  vin?: string
  carFingerprint?: string // Platform (e.g., TESLA_MODEL_3)
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
  routeId?: string,
): Promise<SegmentQlogData | null> => {
  const events: RouteEvent[] = []
  const coords: Coord[] = []
  const metadata: RouteMetadata = { dongleId: dongleId ?? '', routeId: routeId ?? '' }

  let firstGps: GpsLocation | null = null
  let lastGps: GpsLocation | null = null
  let lastState: string | null = null
  let totalDist = 0
  let lastCoord: Coord | null = null

  // For derived events - offset_millis is relative to firstPandaStatesTime
  let recordFrontValue: boolean | null = null
  let firstPandaStatesTime: number | null = null
  let firstRoadCameraFrameTime: number | null = null
  let firstRoadCameraAfterPandaTime: number | null = null
  let initDataTime: number | null = null
  let routeStartTimeFromQlog: number | null = null // First LogMonoTime in the qlog

  try {
    for await (const event of LogReader(stream)) {
      const logMonoTime = Number(event.LogMonoTime || 0)
      if (routeStartTimeFromQlog === null && logMonoTime > 0) routeStartTimeFromQlog = logMonoTime

      // Extract init data
      if ('InitData' in event) {
        const init = event.InitData as InitData
        if (initDataTime === null) initDataTime = logMonoTime

        // Only extract metadata from segment 0
        if (segment === 0) {
          metadata.version = init.Version
          metadata.gitCommit = init.GitCommit
          metadata.gitBranch = init.GitBranch
          metadata.gitRemote = init.GitRemote
          // GitCommitDate format: "'1762565860 2025-11-07 20:37:40 -0500'" -> parse to ISO UTC
          if (init.GitCommitDate) {
            const match = init.GitCommitDate.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})/)
            if (match) {
              const [, date, time, sign, tzH, tzM] = match
              // Parse as UTC with explicit offset
              const utcDate = new Date(`${date}T${time}${sign}${tzH}:${tzM}`)
              metadata.gitCommitDate = utcDate.toISOString().slice(0, 19)
            }
          }
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

      // Extract car params (VIN, fingerprint)
      if ('CarParams' in event && segment === 0) {
        const car = event.CarParams as CarParams
        metadata.vin = car.CarVin
        metadata.carFingerprint = car.CarFingerprint
      }

      // Track first PandaStates time for record_front_toggle event
      if ('PandaStates' in event && firstPandaStatesTime === null) {
        firstPandaStatesTime = logMonoTime
      }

      // Track first road camera frame in this segment
      // Note: Comma uses RoadCameraState.TimestampEof for the event timestamp, but their anchor
      // calculation uses data we don't have access to. We use LogMonoTime which produces
      // consistent relative ordering even if absolute times differ slightly.
      if ('RoadCameraState' in event) {
        if (firstRoadCameraFrameTime === null) firstRoadCameraFrameTime = logMonoTime
        // Also track first RoadCameraState after PandaStates (for boot segment handling)
        if (firstPandaStatesTime !== null && logMonoTime > firstPandaStatesTime && firstRoadCameraAfterPandaTime === null) {
          firstRoadCameraAfterPandaTime = logMonoTime
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
      // Note: We collect these but calculate offset_millis after we know firstPandaStatesTime
      if ('SelfdriveState' in event) {
        const ss = event.SelfdriveState as SelfdriveState
        const state = SELFDRIVE_STATE_NAMES[ss.State ?? 0] || 'disabled'
        const enabled = ss.Enabled ?? false
        const alertStatus = ss.AlertStatus ?? 0
        const stateKey = `${state}|${enabled}|${alertStatus}`
        if (stateKey !== lastState) {
          lastState = stateKey
          // Store with placeholder offset, will recalculate after loop
          events.push({
            type: 'state',
            time: logMonoTime,
            offset_millis: 0, // placeholder
            route_offset_millis: 0, // placeholder
            data: { state, enabled, alertStatus },
          })
        }
      }

      // Extract user flags
      if ('UserFlag' in event) {
        events.push({
          type: 'user_flag',
          time: logMonoTime,
          offset_millis: 0, // placeholder
          route_offset_millis: 0, // placeholder
          data: {},
        })
      }
    }

    // Determine the reference time for offset_millis (firstPandaStatesTime is the anchor)
    // offset_millis is relative to firstPandaStatesTime (can be negative if event is before it)
    // route_offset_millis adds segment offset based on routeStartTimeFromQlog
    const segmentStartOffset = routeStartTimeFromQlog && firstPandaStatesTime ? Math.floor((firstPandaStatesTime - routeStartTimeFromQlog) / 1e6) : 0

    // Add derived events
    const derivedEvents: RouteEvent[] = []

    // record_front_toggle event - emitted for each segment that has RecordFront in InitData
    // This event is anchored at firstPandaStatesTime, so offset_millis = 0
    if (recordFrontValue !== null && firstPandaStatesTime !== null) {
      derivedEvents.push({
        type: 'event',
        time: firstPandaStatesTime,
        offset_millis: 0,
        route_offset_millis: segmentStartOffset + segment * 60000,
        data: { event_type: 'record_front_toggle', value: recordFrontValue },
      })
    }

    // first_road_camera_frame event - emitted for each segment
    // offset_millis is relative to firstPandaStatesTime (can be negative)
    // If firstRoadCameraFrameTime is before InitData, it's a stale frame from before recording
    // started, so use firstRoadCameraAfterPandaTime instead
    if (firstPandaStatesTime !== null) {
      const useAfterPanda = initDataTime !== null && firstRoadCameraFrameTime !== null && firstRoadCameraFrameTime < initDataTime
      const cameraTime = useAfterPanda ? firstRoadCameraAfterPandaTime : firstRoadCameraFrameTime

      if (cameraTime !== null) {
        const offsetMillis = Math.floor((cameraTime - firstPandaStatesTime) / 1e6)
        derivedEvents.push({
          type: 'event',
          time: cameraTime,
          offset_millis: offsetMillis,
          route_offset_millis: segmentStartOffset + offsetMillis + segment * 60000,
          data: { event_type: 'first_road_camera_frame' },
        })
      }
    }

    // Recalculate offset_millis for all collected events (state, user_flag)
    // offset_millis is relative to firstPandaStatesTime
    if (firstPandaStatesTime !== null) {
      for (const ev of events) {
        const offsetMillis = Math.floor((ev.time - firstPandaStatesTime) / 1e6)
        ev.offset_millis = offsetMillis
        ev.route_offset_millis = segmentStartOffset + offsetMillis + segment * 60000
      }
    }

    // Combine and sort all events by time
    const allEvents = [...derivedEvents, ...events].sort((a, b) => a.time - b.time)

    return { events: allEvents, coords, metadata: segment === 0 ? metadata : null, firstGps, lastGps }
  } catch (e) {
    console.error(`Failed to parse qlog:`, e)
    return null
  }
}
