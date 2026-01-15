import { describe, expect, test, setDefaultTimeout } from 'bun:test'
import { processQlogStreaming, type RouteEvent, type Coord, type StreamingQlogResult } from './qlogs'

setDefaultTimeout(60000)

const TEST_DATA_DIR = import.meta.dir + '/../../example-data'

// The two routes to test - all tests run against these
const TEST_ROUTES = ['0000002c--d68dde99ca', '0000006b--d72540bad7']

// Type for comma's route.json structure
type RouteJson = {
  version: string
  git_commit: string
  git_branch: string
  git_remote: string
  git_commit_date: string
  git_dirty: boolean
  platform: string
  vin: string
  start_lat: number
  start_lng: number
  end_lat: number
  end_lng: number
  distance: number
  maxqlog: number
  segment_numbers: number[]
  segment_start_times: number[]
  segment_end_times: number[]
  start_time_utc_millis: number
  end_time_utc_millis: number
}

// Helper to capture streamed JSON arrays into memory for testing
const createCaptureStream = () => {
  const chunks: Uint8Array[] = []
  const stream = new WritableStream<Uint8Array>({
    write(chunk) {
      chunks.push(chunk)
    },
  })
  const getData = () => {
    const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    return JSON.parse(new TextDecoder().decode(combined))
  }
  return { stream, getData }
}

// Wrapper to run streaming processor and capture results for testing
const processQlogForTest = async (
  inputStream: ReadableStream<Uint8Array>,
  segment: number,
  routeStartMonoTime?: string,
): Promise<{ result: StreamingQlogResult; events: RouteEvent[]; coords: Coord[] } | null> => {
  const eventsCapture = createCaptureStream()
  const coordsCapture = createCaptureStream()

  const result = await processQlogStreaming(inputStream, segment, eventsCapture.stream, coordsCapture.stream, undefined, undefined, routeStartMonoTime)
  if (!result) return null

  return {
    result,
    events: eventsCapture.getData() as RouteEvent[],
    coords: coordsCapture.getData() as Coord[],
  }
}

// Type for our segment result - what we derive from qlog processing
type SegmentResult = {
  result: StreamingQlogResult
  events: RouteEvent[]
  coords: Coord[]
}

describe('qlogs - strict 1:1 comparison with comma API', () => {
  for (const routeName of TEST_ROUTES) {
    describe(`route ${routeName}`, () => {
      let routeJson: RouteJson
      let segmentResults: Map<number, SegmentResult>

      test('parse all segments', async () => {
        const routeFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/route.json`)
        expect(await routeFile.exists()).toBe(true)
        routeJson = (await routeFile.json()) as RouteJson

        segmentResults = new Map()

        // First parse segment 0 to get routeStartMonoTime
        const seg0QlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        const seg0Result = await processQlogForTest(seg0QlogFile.stream(), 0)
        expect(seg0Result, 'segment 0 should parse').not.toBeNull()
        segmentResults.set(0, seg0Result!)

        const routeStartMonoTime = seg0Result!.result.monoStartTime ?? undefined

        // Parse remaining segments
        for (const segment of routeJson.segment_numbers) {
          if (segment === 0) continue
          const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/${segment}/qlog.zst`)
          if (!(await qlogFile.exists())) continue

          const result = await processQlogForTest(qlogFile.stream(), segment, routeStartMonoTime)
          if (result) segmentResults.set(segment, result)
        }

        expect(segmentResults.size).toBeGreaterThan(0)
      })

      describe('events - exact match', () => {
        test('each segment events match comma 1:1', async () => {
          for (const [segment, result] of segmentResults) {
            const eventsFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/${segment}/events.json`)
            if (!(await eventsFile.exists())) continue

            const expected = (await eventsFile.json()) as RouteEvent[]
            const actual = result.events

            // Same count
            expect(actual.length, `segment ${segment} event count`).toBe(expected.length)

            // Each event must match exactly
            for (let i = 0; i < expected.length; i++) {
              const exp = expected[i]
              const act = actual[i]

              expect(act.type, `segment ${segment} event ${i} type`).toBe(exp.type)
              expect(act.time, `segment ${segment} event ${i} time`).toBe(exp.time)
              expect(act.offset_millis, `segment ${segment} event ${i} offset_millis`).toBe(exp.offset_millis)
              expect(act.route_offset_millis, `segment ${segment} event ${i} route_offset_millis`).toBe(exp.route_offset_millis)
              expect(JSON.stringify(act.data), `segment ${segment} event ${i} data`).toBe(JSON.stringify(exp.data))
            }
          }
        })
      })

      describe('coords - exact match', () => {
        test('each segment coords match comma 1:1', async () => {
          for (const [segment, result] of segmentResults) {
            const coordsFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/${segment}/coords.json`)
            if (!(await coordsFile.exists())) continue

            const expected = (await coordsFile.json()) as Coord[]
            const actual = result.coords

            // Same count
            expect(actual.length, `segment ${segment} coord count`).toBe(expected.length)

            // Each coord must match exactly
            for (let i = 0; i < expected.length; i++) {
              const exp = expected[i]
              const act = actual[i]

              expect(act.t, `segment ${segment} coord ${i} t`).toBe(exp.t)
              expect(act.lat, `segment ${segment} coord ${i} lat`).toBe(exp.lat)
              expect(act.lng, `segment ${segment} coord ${i} lng`).toBe(exp.lng)
              expect(act.speed, `segment ${segment} coord ${i} speed`).toBe(exp.speed)
              expect(act.dist, `segment ${segment} coord ${i} dist`).toBe(exp.dist)
            }
          }
        })
      })

      describe('segment times - exact match', () => {
        test('each segment start/end times match comma 1:1', async () => {
          for (const [segment, result] of segmentResults) {
            const segIdx = routeJson.segment_numbers.indexOf(segment)
            if (segIdx === -1) continue

            const expectedStart = routeJson.segment_start_times[segIdx]
            const expectedEnd = routeJson.segment_end_times[segIdx]

            // Calculate our start/end times the same way processFile does
            const startTime = result.result.firstGps?.UnixTimestampMillis ? Number(result.result.firstGps.UnixTimestampMillis) : null
            const segmentDurationMs =
              result.result.segmentMonoStart && result.result.segmentMonoEnd
                ? (Number(result.result.segmentMonoEnd) - Number(result.result.segmentMonoStart)) / 1e6
                : null
            const endTime = startTime && segmentDurationMs ? startTime + segmentDurationMs : null

            expect(startTime, `segment ${segment} start_time`).toBe(expectedStart)
            expect(endTime, `segment ${segment} end_time`).toBe(expectedEnd)
          }
        })
      })

      describe('route metadata - exact match', () => {
        test('metadata from segment 0 matches comma 1:1', async () => {
          const seg0 = segmentResults.get(0)
          expect(seg0).toBeDefined()

          const metadata = seg0!.result.metadata
          expect(metadata?.version, 'version').toBe(routeJson.version)
          expect(metadata?.gitCommit, 'git_commit').toBe(routeJson.git_commit)
          expect(metadata?.gitBranch, 'git_branch').toBe(routeJson.git_branch)
          expect(metadata?.gitRemote?.replace('https://', '').replace('.git', ''), 'git_remote').toBe(routeJson.git_remote)
          expect(metadata?.gitCommitDate, 'git_commit_date').toBe(routeJson.git_commit_date)
          expect(metadata?.gitDirty, 'git_dirty').toBe(routeJson.git_dirty)
          expect(metadata?.carFingerprint, 'platform').toBe(routeJson.platform)
          expect(metadata?.vin, 'vin').toBe(routeJson.vin)
        })

        test('start GPS matches comma 1:1', async () => {
          const seg0 = segmentResults.get(0)
          expect(seg0).toBeDefined()

          expect(seg0!.result.firstGps?.Latitude, 'start_lat').toBe(routeJson.start_lat)
          expect(seg0!.result.firstGps?.Longitude, 'start_lng').toBe(routeJson.start_lng)
        })

        test('end GPS matches comma 1:1', async () => {
          const lastSegment = Math.max(...segmentResults.keys())
          const lastSeg = segmentResults.get(lastSegment)
          expect(lastSeg).toBeDefined()

          expect(lastSeg!.result.lastGps?.Latitude, 'end_lat').toBe(routeJson.end_lat)
          expect(lastSeg!.result.lastGps?.Longitude, 'end_lng').toBe(routeJson.end_lng)
        })
      })

      describe('route aggregation - exact match', () => {
        test('route start/end times match comma 1:1', async () => {
          // Route start time = first segment start time
          const seg0 = segmentResults.get(0)
          expect(seg0).toBeDefined()
          const startTime = seg0!.result.firstGps?.UnixTimestampMillis ? Number(seg0!.result.firstGps.UnixTimestampMillis) : null
          expect(startTime, 'route start_time_utc_millis').toBe(routeJson.start_time_utc_millis)

          // Route end time = last segment end time
          const lastSegment = Math.max(...segmentResults.keys())
          const lastSeg = segmentResults.get(lastSegment)
          expect(lastSeg).toBeDefined()
          const lastStartTime = lastSeg!.result.firstGps?.UnixTimestampMillis ? Number(lastSeg!.result.firstGps.UnixTimestampMillis) : null
          const lastDurationMs =
            lastSeg!.result.segmentMonoStart && lastSeg!.result.segmentMonoEnd
              ? (Number(lastSeg!.result.segmentMonoEnd) - Number(lastSeg!.result.segmentMonoStart)) / 1e6
              : null
          const endTime = lastStartTime && lastDurationMs ? lastStartTime + lastDurationMs : null
          expect(endTime, 'route end_time_utc_millis').toBe(routeJson.end_time_utc_millis)
        })

        test('total distance matches comma 1:1', async () => {
          let totalDistance = 0
          for (const [, result] of segmentResults) {
            totalDistance += result.result.totalDistance
          }
          expect(totalDistance, 'total distance').toBe(routeJson.distance)
        })
      })
    })
  }
})
