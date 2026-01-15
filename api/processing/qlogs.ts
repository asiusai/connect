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

type RoadCameraState = {
  TimestampEof?: number
  TimestampSof?: number
  FrameId?: number
}

type Clocks = {
  WallTimeNanos?: number
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
  monoStartTime: string | null // first log monotonic time in ns (for route_offset_millis and coords t calculation)
  monoEndTime: string | null // last log monotonic time in ns
  segmentMonoStart: string | null // this segment's first mono time (for duration calc, excludes replayed InitData)
  segmentMonoEnd: string | null // this segment's last mono time (same as monoEndTime)
  // Wall clock calibration from Clocks message
  clocksWallTimeNanos: string | null // Clocks.WallTimeNanos
  clocksMonoTime: string | null // LogMonoTime when Clocks was logged
  // Frame-based duration (more reliable than mono time for partial segments)
  frameCount: number // Number of road camera frames (duration = frameCount / 20)
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
// routeStartMonoTime: The first monotonic time from segment 0 (used to calculate route_offset_millis and coords t)
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
  let firstDriverCameraStateTime: number | null = null
  let firstPandaStatesTimeAfterInit: number | null = null
  let firstDriverCameraStateTimeAfterInit: number | null = null
  let firstRoadCameraTimestampEof: number | null = null // Use TimestampEof from RoadCameraState for first_road_camera_frame
  let firstRoadCameraAfterPandaTimestampEof: number | null = null
  let firstFrameId: number | null = null // First RoadCameraState.FrameId
  let lastFrameId: number | null = null // Last RoadCameraState.FrameId (for duration = frames / 20fps)
  let initDataTime: number | null = null
  let routeStartTimeFromQlog: number | null = null
  let firstClocks: Clocks | null = null
  let firstClocksMonoTime: number | null = null
  // For non-zero segments, track the minimum Sentinel timestamp after the previous segment's timeframe
  // This is used to determine the segment's actual start time for route_offset_millis calculation
  let minSentinelTimeAfterPrevSegment: number | null = null
  const routeStartMono = routeStartMonoTime ? Number(routeStartMonoTime) : null
  // Threshold: if routeStartMonoTime is provided, only consider timestamps > routeStartMono + 30 seconds
  // (segment 0 is ~60 seconds, so this ensures we're looking at current segment's data)
  const prevSegmentThreshold = routeStartMono ? routeStartMono + 30e9 : null
  // Track segment's own start time (for duration calculation, not route offset)
  let segmentFirstMonoTime: number | null = null

  try {
    await coordsWriter.start()

    let lastLogMonoTime: number | null = null

    // Wrap the iterator in a try-catch to handle truncated zstd files gracefully
    // This allows partial data to be processed even if the file is incomplete
    try {
      for await (const event of LogReader(inputStream)) {
        const logMonoTime = Number(event.LogMonoTime || 0)
        if (routeStartTimeFromQlog === null && logMonoTime > 0) routeStartTimeFromQlog = logMonoTime
        if (logMonoTime > 0) lastLogMonoTime = logMonoTime
        // Track segment's own first mono time (excluding replayed InitData from previous segments)
        if (segmentFirstMonoTime === null && logMonoTime > 0 && (prevSegmentThreshold === null || logMonoTime > prevSegmentThreshold)) {
          segmentFirstMonoTime = logMonoTime
        }

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

        if ('PandaStates' in event) {
          if (firstPandaStatesTime === null) firstPandaStatesTime = logMonoTime
          if (initDataTime !== null && firstPandaStatesTimeAfterInit === null && logMonoTime > initDataTime) {
            firstPandaStatesTimeAfterInit = logMonoTime
          }
        }

        if ('DriverCameraState' in event) {
          if (firstDriverCameraStateTime === null) firstDriverCameraStateTime = logMonoTime
          if (initDataTime !== null && firstDriverCameraStateTimeAfterInit === null && logMonoTime > initDataTime) {
            firstDriverCameraStateTimeAfterInit = logMonoTime
          }
        }

        // Track minimum Sentinel (Valid) timestamp for segment boundary detection
        if ('Valid' in event && prevSegmentThreshold !== null && logMonoTime > prevSegmentThreshold) {
          if (minSentinelTimeAfterPrevSegment === null || logMonoTime < minSentinelTimeAfterPrevSegment) {
            minSentinelTimeAfterPrevSegment = logMonoTime
          }
        }

        if ('RoadCameraState' in event) {
          const rcs = event.RoadCameraState as RoadCameraState
          const timestampEof = rcs.TimestampEof ? Number(rcs.TimestampEof) : null
          const frameId = rcs.FrameId
          if (firstRoadCameraTimestampEof === null && timestampEof !== null) {
            firstRoadCameraTimestampEof = timestampEof
          }
          if (firstPandaStatesTime !== null && timestampEof !== null && timestampEof > firstPandaStatesTime && firstRoadCameraAfterPandaTimestampEof === null) {
            firstRoadCameraAfterPandaTimestampEof = timestampEof
          }
          // Track frame IDs for duration calculation (frames / 20fps)
          if (frameId !== undefined) {
            if (firstFrameId === null) firstFrameId = frameId
            lastFrameId = frameId
          }
        }

        if ('Clocks' in event && firstClocks === null) {
          firstClocks = event.Clocks as Clocks
          firstClocksMonoTime = logMonoTime
        }

        // Stream coords directly - this is the main memory savings
        if ('GpsLocationExternal' in event || 'GpsLocation' in event) {
          const gps = (event.GpsLocationExternal || event.GpsLocation) as GpsLocation
          if (gps.HasFix && gps.Latitude && gps.Longitude) {
            if (!firstGps) firstGps = gps
            lastGps = gps

            // Calculate t as seconds from route start using monotonic time
            const routeRefMono = routeStartMono ?? routeStartTimeFromQlog
            const t = routeRefMono ? Math.round((logMonoTime - routeRefMono) / 1e9) : 0

            // Filter out coords at segment boundaries (t >= (segment+1)*60)
            const segmentEndT = (segment + 1) * 60
            if (t >= segmentEndT) continue

            const lat = gps.Latitude
            const lng = gps.Longitude
            const speed = gps.Speed || 0

            if (lastCoord) {
              const dt = t - lastCoord.t
              if (dt > 0) totalDist += (speed * dt) / 1000
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
    } catch (iterErr) {
      // Handle truncated zstd files - continue with partial data
      console.warn(`Qlog file truncated, processing partial data: ${iterErr instanceof Error ? iterErr.message : iterErr}`)
    }

    await coordsWriter.end()

    // Process events (same logic as before, but write to stream)
    // The reference point for route_offset_millis is segment 0's routeStartTimeFromQlog (first log entry time).
    // For segment 0, routeStartMonoTime is not provided, so we use routeStartTimeFromQlog.
    // For other segments, routeStartMonoTime should be segment 0's routeStartTimeFromQlog.
    const routeRefTime = routeStartMonoTime ? Number(routeStartMonoTime) : routeStartTimeFromQlog

    // segmentStartTime: the reference time for this segment's events (offset_millis calculation)
    // For segment 0: use whichever comes first AFTER InitData: PandaStates or DriverCameraState
    // For other segments: use the minimum Sentinel timestamp after the previous segment (more accurate)
    let segmentStartTime: number | null = null
    if (segment === 0) {
      // Use whichever comes first after InitData
      if (firstPandaStatesTimeAfterInit !== null && firstDriverCameraStateTimeAfterInit !== null) {
        segmentStartTime = Math.min(firstPandaStatesTimeAfterInit, firstDriverCameraStateTimeAfterInit)
      } else {
        segmentStartTime = firstPandaStatesTimeAfterInit ?? firstDriverCameraStateTimeAfterInit ?? firstPandaStatesTime
      }
    } else {
      segmentStartTime = minSentinelTimeAfterPrevSegment ?? firstPandaStatesTime
    }

    // offset_millis is always relative to this segment's start time (truncate toward zero)
    const calcOffsetMillis = (eventTime: number) => (segmentStartTime ? Math.trunc((eventTime - segmentStartTime) / 1e6) : 0)

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
      const useAfterPanda = initDataTime !== null && firstRoadCameraTimestampEof !== null && firstRoadCameraTimestampEof < initDataTime
      const cameraTime = useAfterPanda ? firstRoadCameraAfterPandaTimestampEof : firstRoadCameraTimestampEof

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

    // Frame count for duration calculation (frameCount / 20 = seconds)
    const frameCount = firstFrameId !== null && lastFrameId !== null ? lastFrameId - firstFrameId + 1 : 0

    return {
      metadata: segment === 0 ? metadata : null,
      firstGps,
      lastGps,
      totalDistance: totalDist,
      eventCount: allEvents.length,
      coordCount,
      monoStartTime: routeStartTimeFromQlog ? String(routeStartTimeFromQlog) : null,
      monoEndTime: lastLogMonoTime ? String(lastLogMonoTime) : null,
      segmentMonoStart: segmentFirstMonoTime ? String(segmentFirstMonoTime) : routeStartTimeFromQlog ? String(routeStartTimeFromQlog) : null,
      segmentMonoEnd: lastLogMonoTime ? String(lastLogMonoTime) : null,
      clocksWallTimeNanos: firstClocks?.WallTimeNanos ? String(firstClocks.WallTimeNanos) : null,
      clocksMonoTime: firstClocksMonoTime ? String(firstClocksMonoTime) : null,
      frameCount,
    }
  } catch (e) {
    console.error(`Failed to parse qlog:`, e)
    return null
  }
}
