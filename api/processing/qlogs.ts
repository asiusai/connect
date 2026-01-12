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

// Streaming result - events and coords are written to streams, only summary data returned
export type StreamingQlogResult = {
  metadata: RouteMetadata | null
  firstGps: GpsLocation | null
  lastGps: GpsLocation | null
  totalDistance: number
  eventCount: number
  coordCount: number
  monoStartTime: string | null // first log monotonic time in ns (for route_offset_millis calculation)
}

// JSON array streaming writer - writes items as they come, producing valid JSON array
class JsonArrayWriter {
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private encoder = new TextEncoder()
  private first = true

  constructor(stream: WritableStream<Uint8Array>) {
    this.writer = stream.getWriter()
  }

  async start() {
    await this.writer.write(this.encoder.encode('['))
  }

  async write(item: unknown) {
    const prefix = this.first ? '' : ','
    this.first = false
    await this.writer.write(this.encoder.encode(prefix + JSON.stringify(item)))
  }

  async end() {
    await this.writer.write(this.encoder.encode(']'))
    await this.writer.close()
  }
}

// Streaming version - writes events and coords to provided streams as they are parsed
// This significantly reduces memory usage for large qlogs
// routeStartMonoTime: The first monotonic time from segment 0 (used to calculate route_offset_millis for non-zero segments)
export const processQlogStreaming = async (
  inputStream: ReadableStream<Uint8Array>,
  segment: number,
  eventsStream: WritableStream<Uint8Array>,
  coordsStream: WritableStream<Uint8Array>,
  dongleId?: string,
  routeId?: string,
  routeStartMonoTime?: string,
): Promise<StreamingQlogResult | null> => {
  const metadata: RouteMetadata = { dongleId: dongleId ?? '', routeId: routeId ?? '' }
  const coordsWriter = new JsonArrayWriter(coordsStream)

  let firstGps: GpsLocation | null = null
  let lastGps: GpsLocation | null = null
  let lastState: string | null = null
  let totalDist = 0
  let lastCoord: Coord | null = null
  let coordCount = 0

  // Events still need to be buffered because they require sorting and offset calculation
  // But they're much smaller than coords (typically <100 events vs thousands of coords)
  const pendingEvents: RouteEvent[] = []

  let recordFrontValue: boolean | null = null
  let firstPandaStatesTime: number | null = null
  let firstRoadCameraFrameTime: number | null = null
  let firstRoadCameraAfterPandaTime: number | null = null
  let initDataTime: number | null = null
  let routeStartTimeFromQlog: number | null = null
  // For non-zero segments, track the minimum Sentinel timestamp after the previous segment's timeframe
  // This is used to determine the segment's actual start time for route_offset_millis calculation
  let minSentinelTimeAfterPrevSegment: number | null = null
  const routeStartMono = routeStartMonoTime ? Number(routeStartMonoTime) : null
  // Threshold: if routeStartMonoTime is provided, only consider timestamps > routeStartMono + 30 seconds
  // (segment 0 is ~60 seconds, so this ensures we're looking at current segment's data)
  const prevSegmentThreshold = routeStartMono ? routeStartMono + 30e9 : null

  try {
    await coordsWriter.start()

    for await (const event of LogReader(inputStream)) {
      const logMonoTime = Number(event.LogMonoTime || 0)
      if (routeStartTimeFromQlog === null && logMonoTime > 0) routeStartTimeFromQlog = logMonoTime

      // Extract init data
      if ('InitData' in event) {
        const init = event.InitData as InitData
        if (initDataTime === null) initDataTime = logMonoTime

        if (segment === 0) {
          metadata.version = init.Version
          metadata.gitCommit = init.GitCommit
          metadata.gitBranch = init.GitBranch
          metadata.gitRemote = init.GitRemote
          if (init.GitCommitDate) {
            const match = init.GitCommitDate.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})/)
            if (match) {
              const [, date, time, sign, tzH, tzM] = match
              const utcDate = new Date(`${date}T${time}${sign}${tzH}:${tzM}`)
              metadata.gitCommitDate = utcDate.toISOString().slice(0, 19)
            }
          }
          metadata.gitDirty = init.Dirty
        }

        if (init.Params?.Entries) {
          const recordFrontParam = init.Params.Entries.find((e) => e.Key === 'RecordFront')
          if (recordFrontParam) recordFrontValue = recordFrontParam.Value === '1'
        }
      }

      if ('CarParams' in event && segment === 0) {
        const car = event.CarParams as CarParams
        metadata.vin = car.CarVin
        metadata.carFingerprint = car.CarFingerprint
      }

      if ('PandaStates' in event && firstPandaStatesTime === null) {
        firstPandaStatesTime = logMonoTime
      }

      // Track minimum Sentinel (Valid) timestamp for segment boundary detection
      if ('Valid' in event && prevSegmentThreshold !== null && logMonoTime > prevSegmentThreshold) {
        if (minSentinelTimeAfterPrevSegment === null || logMonoTime < minSentinelTimeAfterPrevSegment) {
          minSentinelTimeAfterPrevSegment = logMonoTime
        }
      }

      if ('RoadCameraState' in event) {
        if (firstRoadCameraFrameTime === null) firstRoadCameraFrameTime = logMonoTime
        if (firstPandaStatesTime !== null && logMonoTime > firstPandaStatesTime && firstRoadCameraAfterPandaTime === null) {
          firstRoadCameraAfterPandaTime = logMonoTime
        }
      }

      // Stream coords directly - this is the main memory savings
      if ('GpsLocationExternal' in event || 'GpsLocation' in event) {
        const gps = (event.GpsLocationExternal || event.GpsLocation) as GpsLocation
        if (gps.HasFix && gps.Latitude && gps.Longitude && gps.UnixTimestampMillis) {
          if (!firstGps) firstGps = gps
          lastGps = gps

          const t = Math.floor(Number(gps.UnixTimestampMillis) / 1000)
          const lat = gps.Latitude
          const lng = gps.Longitude
          const speed = gps.Speed || 0

          if (lastCoord) {
            const dt = t - lastCoord.t
            totalDist += (speed * dt) / 1000
          }

          const coord: Coord = { t, lat, lng, speed, dist: Math.round(totalDist * 1e6) / 1e6 }
          await coordsWriter.write(coord)
          lastCoord = coord
          coordCount++
        }
      }

      // Buffer events (small footprint)
      if ('SelfdriveState' in event) {
        const ss = event.SelfdriveState as SelfdriveState
        const state = SELFDRIVE_STATE_NAMES[ss.State ?? 0] || 'disabled'
        const enabled = ss.Enabled ?? false
        const alertStatus = ss.AlertStatus ?? 0
        const stateKey = `${state}|${enabled}|${alertStatus}`
        if (stateKey !== lastState) {
          lastState = stateKey
          pendingEvents.push({
            type: 'state',
            time: logMonoTime,
            offset_millis: 0,
            route_offset_millis: 0,
            data: { state, enabled, alertStatus },
          })
        }
      }

      if ('UserFlag' in event) {
        pendingEvents.push({
          type: 'user_flag',
          time: logMonoTime,
          offset_millis: 0,
          route_offset_millis: 0,
          data: {},
        })
      }
    }

    await coordsWriter.end()

    // Process events (same logic as before, but write to stream)
    // The reference point for route_offset_millis is segment 0's routeStartTimeFromQlog (first log entry time).
    // For segment 0, routeStartMonoTime is not provided, so we use routeStartTimeFromQlog.
    // For other segments, routeStartMonoTime should be segment 0's routeStartTimeFromQlog.
    const routeRefTime = routeStartMonoTime ? Number(routeStartMonoTime) : routeStartTimeFromQlog

    // segmentStartTime: the reference time for this segment's events
    // For segment 0: use firstPandaStatesTime
    // For other segments: use the minimum Sentinel timestamp after the previous segment (more accurate)
    const segmentStartTime = segment === 0 ? firstPandaStatesTime : (minSentinelTimeAfterPrevSegment ?? firstPandaStatesTime)

    // offset_millis is always relative to this segment's start time
    const calcOffsetMillis = (eventTime: number) => (segmentStartTime ? Math.floor((eventTime - segmentStartTime) / 1e6) : 0)

    // route_offset_millis is always relative to the route's reference time (segment 0's routeStartTimeFromQlog)
    const calcRouteOffsetMillis = (eventTime: number) => (routeRefTime ? Math.floor((eventTime - routeRefTime) / 1e6) : segment * 60000)

    const derivedEvents: RouteEvent[] = []

    if (recordFrontValue !== null && segmentStartTime !== null) {
      derivedEvents.push({
        type: 'event',
        time: segmentStartTime,
        offset_millis: 0,
        route_offset_millis: calcRouteOffsetMillis(segmentStartTime),
        data: { event_type: 'record_front_toggle', value: recordFrontValue },
      })
    }

    if (segmentStartTime !== null) {
      const useAfterPanda = initDataTime !== null && firstRoadCameraFrameTime !== null && firstRoadCameraFrameTime < initDataTime
      const cameraTime = useAfterPanda ? firstRoadCameraAfterPandaTime : firstRoadCameraFrameTime

      if (cameraTime !== null) {
        derivedEvents.push({
          type: 'event',
          time: cameraTime,
          offset_millis: calcOffsetMillis(cameraTime),
          route_offset_millis: calcRouteOffsetMillis(cameraTime),
          data: { event_type: 'first_road_camera_frame' },
        })
      }
    }

    if (segmentStartTime !== null) {
      for (const ev of pendingEvents) {
        ev.offset_millis = calcOffsetMillis(ev.time)
        ev.route_offset_millis = calcRouteOffsetMillis(ev.time)
      }
    }

    const allEvents = [...derivedEvents, ...pendingEvents].sort((a, b) => a.time - b.time)

    // Write events to stream
    const eventsWriter = new JsonArrayWriter(eventsStream)
    await eventsWriter.start()
    for (const ev of allEvents) await eventsWriter.write(ev)
    await eventsWriter.end()

    return {
      metadata: segment === 0 ? metadata : null,
      firstGps,
      lastGps,
      totalDistance: totalDist,
      eventCount: allEvents.length,
      coordCount,
      monoStartTime: routeStartTimeFromQlog ? String(routeStartTimeFromQlog) : null,
    }
  } catch (e) {
    console.error(`Failed to parse qlog:`, e)
    return null
  }
}
