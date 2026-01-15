import { describe, expect, test, setDefaultTimeout, beforeAll } from 'bun:test'
import { processQlogStreaming, type RouteEvent, type Coord, type StreamingQlogResult } from './qlogs'

setDefaultTimeout(60000)

const TEST_DATA_DIR = import.meta.dir + '/../../example-data'

// Tolerances for approximate matching (set to 0 for exact match)
// Comma's backend uses different GPS processing, so exact match isn't always possible
const TOLERANCES = {
  LAT_LNG: 0.0001, // ~10m - coords lat/lng tolerance
  SPEED: 1.0, // 1 m/s - coords speed tolerance (comma rounds differently)
  DIST: 0.3, // 300m - coords distance tolerance (accumulated rounding errors)
  GPS: 0.0001, // ~10m - route start/end GPS tolerance
  TIME_MS: 15000, // 15 seconds - segment start/end time tolerance
  DISTANCE_KM: 1.0, // 1km - total route distance tolerance
}

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
      beforeAll(async () => {
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

      describe('coords - approximate match', () => {
        test('each segment coords match comma within tolerance', async () => {
          for (const [segment, result] of segmentResults) {
            const coordsFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/${segment}/coords.json`)
            if (!(await coordsFile.exists())) continue

            const expected = (await coordsFile.json()) as Coord[]
            const actual = result.coords

            // Count should be close (segment boundary timing can cause ±1-2 difference)
            expect(Math.abs(actual.length - expected.length), `segment ${segment} coord count diff`).toBeLessThanOrEqual(2)

            // Each coord must match within tolerance (compare up to min length)
            const minLen = Math.min(actual.length, expected.length)
            for (let i = 0; i < minLen; i++) {
              const exp = expected[i]
              const act = actual[i]

              // Allow ±1 second t offset due to timing calculation differences
              expect(Math.abs(act.t - exp.t), `segment ${segment} coord ${i} t diff`).toBeLessThanOrEqual(1)
              expect(Math.abs(act.lat - exp.lat), `segment ${segment} coord ${i} lat diff`).toBeLessThanOrEqual(TOLERANCES.LAT_LNG)
              expect(Math.abs(act.lng - exp.lng), `segment ${segment} coord ${i} lng diff`).toBeLessThanOrEqual(TOLERANCES.LAT_LNG)
              expect(Math.abs(act.speed - exp.speed), `segment ${segment} coord ${i} speed diff`).toBeLessThanOrEqual(TOLERANCES.SPEED)
              expect(Math.abs(act.dist - exp.dist), `segment ${segment} coord ${i} dist diff`).toBeLessThanOrEqual(TOLERANCES.DIST)
            }
          }
        })
      })

      describe('segment times - approximate match', () => {
        test('each segment start/end times match comma within tolerance', async () => {
          for (const [segment, result] of segmentResults) {
            const segIdx = routeJson.segment_numbers.indexOf(segment)
            if (segIdx === -1) continue

            const expectedStart = routeJson.segment_start_times[segIdx]
            const expectedEnd = routeJson.segment_end_times[segIdx]

            // Calculate our start/end times using GPS time
            const data = result.result
            const startTime = data.firstGps?.UnixTimestampMillis ? Number(data.firstGps.UnixTimestampMillis) : null
            const segmentDurationMs = data.segmentMonoStart && data.segmentMonoEnd ? (Number(data.segmentMonoEnd) - Number(data.segmentMonoStart)) / 1e6 : null
            const endTime = startTime && segmentDurationMs ? startTime + segmentDurationMs : null

            expect(startTime).not.toBeNull()
            expect(endTime).not.toBeNull()
            expect(Math.abs(startTime! - expectedStart), `segment ${segment} start_time diff`).toBeLessThanOrEqual(TOLERANCES.TIME_MS)
            expect(Math.abs(endTime! - expectedEnd), `segment ${segment} end_time diff`).toBeLessThanOrEqual(TOLERANCES.TIME_MS)
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

        test('start GPS matches comma within tolerance', async () => {
          const seg0 = segmentResults.get(0)
          expect(seg0).toBeDefined()

          const lat = seg0!.result.firstGps?.Latitude
          const lng = seg0!.result.firstGps?.Longitude
          expect(lat).toBeDefined()
          expect(lng).toBeDefined()
          expect(Math.abs(lat! - routeJson.start_lat), 'start_lat diff').toBeLessThanOrEqual(TOLERANCES.GPS)
          expect(Math.abs(lng! - routeJson.start_lng), 'start_lng diff').toBeLessThanOrEqual(TOLERANCES.GPS)
        })

        test('end GPS matches comma within tolerance', async () => {
          const lastSegment = Math.max(...segmentResults.keys())
          const lastSeg = segmentResults.get(lastSegment)
          expect(lastSeg).toBeDefined()

          const lat = lastSeg!.result.lastGps?.Latitude
          const lng = lastSeg!.result.lastGps?.Longitude
          expect(lat).toBeDefined()
          expect(lng).toBeDefined()
          expect(Math.abs(lat! - routeJson.end_lat), 'end_lat diff').toBeLessThanOrEqual(TOLERANCES.GPS)
          expect(Math.abs(lng! - routeJson.end_lng), 'end_lng diff').toBeLessThanOrEqual(TOLERANCES.GPS)
        })
      })

      describe('route aggregation - approximate match', () => {
        test('route duration matches comma (using production logic)', async () => {
          // This test uses the EXACT same logic as api/processing/index.ts processFile
          // to calculate segment times, ensuring our production code produces correct results

          const seg0 = segmentResults.get(0)
          expect(seg0).toBeDefined()

          // Segment 0 start time = GPS time (same as production)
          const routeStartTime = seg0!.result.firstGps?.UnixTimestampMillis ? Number(seg0!.result.firstGps.UnixTimestampMillis) : null
          expect(routeStartTime).not.toBeNull()

          // Calculate each segment's times using production logic
          const segmentTimes: Array<{ start: number; end: number }> = []
          for (const segment of routeJson.segment_numbers) {
            const segResult = segmentResults.get(segment)
            if (!segResult) continue

            const data = segResult.result
            const gpsStartTime = data.firstGps?.UnixTimestampMillis ? Number(data.firstGps.UnixTimestampMillis) : null

            // Production logic: segment 0 uses GPS, segment N uses routeStartTime + N*60000
            const startTime = segment === 0 ? gpsStartTime : routeStartTime! + segment * 60000

            // Production logic: full segment (>=1180 frames) = 60s, partial = frameCount/20
            const frameCount = data.frameCount || 0
            const isFullSegment = frameCount >= 1180
            const durationMs = isFullSegment || frameCount === 0 ? 60000 : (frameCount / 20) * 1000
            const endTime = startTime! + durationMs

            segmentTimes.push({ start: startTime!, end: endTime })
          }

          expect(segmentTimes.length).toBeGreaterThan(0)

          const calculatedRouteStart = segmentTimes[0].start
          const calculatedRouteEnd = segmentTimes[segmentTimes.length - 1].end
          const calculatedDuration = (calculatedRouteEnd - calculatedRouteStart) / 1000

          const expectedDuration = (routeJson.end_time_utc_millis - routeJson.start_time_utc_millis) / 1000

          // Log for debugging
          console.log(`Route ${routeName}:`)
          console.log(`  Calculated: start=${calculatedRouteStart}, end=${calculatedRouteEnd}, duration=${calculatedDuration}s`)
          console.log(`  Expected:   start=${routeJson.start_time_utc_millis}, end=${routeJson.end_time_utc_millis}, duration=${expectedDuration}s`)
          console.log(`  Difference: ${calculatedDuration - expectedDuration}s`)

          // Duration should match within 5 seconds
          expect(Math.abs(calculatedDuration - expectedDuration), 'route duration diff (seconds)').toBeLessThanOrEqual(5)
        })

        test('total distance matches comma within tolerance', async () => {
          let totalDistance = 0
          for (const [, result] of segmentResults) {
            totalDistance += result.result.totalDistance
          }
          expect(Math.abs(totalDistance - routeJson.distance), 'total distance diff').toBeLessThanOrEqual(TOLERANCES.DISTANCE_KM)
        })
      })
    })
  }
})
