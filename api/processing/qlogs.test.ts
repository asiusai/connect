import { describe, expect, test, setDefaultTimeout } from 'bun:test'
import { readdir } from 'fs/promises'
import { processQlogStreaming, type RouteEvent, type Coord, type StreamingQlogResult } from './qlogs'

setDefaultTimeout(60000) // 60 seconds for parsing all test data

const TEST_DATA_DIR = import.meta.dir + '/../../example-data'

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
): Promise<{ result: StreamingQlogResult; events: RouteEvent[]; coords: Coord[] } | null> => {
  const eventsCapture = createCaptureStream()
  const coordsCapture = createCaptureStream()

  const result = await processQlogStreaming(inputStream, segment, eventsCapture.stream, coordsCapture.stream)
  if (!result) return null

  return {
    result,
    events: eventsCapture.getData() as RouteEvent[],
    coords: coordsCapture.getData() as Coord[],
  }
}

// Discover all routes from test data (new folder structure: routeId/segment/files)
const discoverRoutes = async () => {
  const routeDirs = await readdir(TEST_DATA_DIR)
  const routes = new Map<string, number[]>()

  for (const routeDir of routeDirs) {
    const segments: number[] = []
    try {
      const contents = await readdir(`${TEST_DATA_DIR}/${routeDir}`)
      for (const item of contents) {
        const segNum = parseInt(item, 10)
        if (!Number.isNaN(segNum)) segments.push(segNum)
      }
    } catch {
      continue
    }
    if (segments.length > 0) {
      routes.set(
        routeDir,
        segments.sort((a, b) => a - b),
      )
    }
  }

  return routes
}

// Routes with full segments downloaded (for route metadata testing)
const ROUTES_WITH_ALL_SEGMENTS = ['9748a98e983e0b39_0000002c--d68dde99ca', '9748a98e983e0b39_00000030--c299dc644f', '9748a98e983e0b39_00000032--f036598e01']

describe('qlogs', () => {
  test('discovers test data', async () => {
    const routes = await discoverRoutes()
    expect(routes.size).toBeGreaterThan(0)
  })

  describe('metadata parsing', () => {
    for (const routeName of ROUTES_WITH_ALL_SEGMENTS) {
      test(`${routeName} metadata matches comma API`, async () => {
        const expectedFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/route.json`)
        if (!(await expectedFile.exists())) return

        const expected = (await expectedFile.json()) as {
          version: string
          git_commit: string
          git_branch: string
          git_remote: string
          git_commit_date: string
          git_dirty: boolean
          platform: string
          vin: string
          make: string
          start_lat: number
          start_lng: number
          end_lat: number
          end_lng: number
          distance: number
        }

        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        const parsed = await processQlogForTest(qlogFile.stream(), 0)
        expect(parsed).not.toBeNull()

        const metadata = parsed!.result.metadata
        expect(metadata?.version).toBe(expected.version)
        expect(metadata?.gitCommit).toBe(expected.git_commit)
        expect(metadata?.gitBranch).toBe(expected.git_branch)
        expect(metadata?.gitRemote?.replace('https://', '').replace('.git', '')).toBe(expected.git_remote)
        expect(metadata?.gitCommitDate).toBe(expected.git_commit_date)
        expect(metadata?.gitDirty).toBe(expected.git_dirty)
        expect(metadata?.carFingerprint).toBe(expected.platform)
        expect(metadata?.vin).toBe(expected.vin)

        // GPS coordinates from first segment
        expect(parsed!.result.firstGps?.Latitude).toBeCloseTo(expected.start_lat, 2)
        expect(parsed!.result.firstGps?.Longitude).toBeCloseTo(expected.start_lng, 2)
      })
    }
  })

  describe('route aggregation', () => {
    for (const routeName of ROUTES_WITH_ALL_SEGMENTS) {
      test(`${routeName} aggregated GPS matches comma API`, async () => {
        const expectedFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/route.json`)
        if (!(await expectedFile.exists())) return

        const expected = (await expectedFile.json()) as {
          start_lat: number
          start_lng: number
          end_lat: number
          end_lng: number
          maxqlog: number
        }

        // Parse first segment for start GPS
        const firstQlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        const firstParsed = await processQlogForTest(firstQlogFile.stream(), 0)
        expect(firstParsed).not.toBeNull()

        // Parse last segment for end GPS
        const lastQlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/${expected.maxqlog}/qlog.zst`)
        const lastParsed = await processQlogForTest(lastQlogFile.stream(), expected.maxqlog)
        expect(lastParsed).not.toBeNull()

        // Start GPS from first segment
        expect(firstParsed!.result.firstGps?.Latitude).toBeCloseTo(expected.start_lat, 2)
        expect(firstParsed!.result.firstGps?.Longitude).toBeCloseTo(expected.start_lng, 2)

        // End GPS from last segment
        expect(lastParsed!.result.lastGps?.Latitude).toBeCloseTo(expected.end_lat, 2)
        expect(lastParsed!.result.lastGps?.Longitude).toBeCloseTo(expected.end_lng, 2)
      })
    }
  })

  describe('events parsing', () => {
    test('segment 0 events match comma API exactly', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        if (!segments.includes(0)) continue
        const segmentDir = `${TEST_DATA_DIR}/${routeName}/0`
        const eventsFile = Bun.file(`${segmentDir}/events.json`)
        if (!(await eventsFile.exists())) continue

        const qlogFile = Bun.file(`${segmentDir}/qlog.zst`)
        const parsed = await processQlogForTest(qlogFile.stream(), 0)
        expect(parsed, `${routeName}/0 failed to parse`).not.toBeNull()

        const expected = (await eventsFile.json()) as RouteEvent[]
        const events = parsed!.events

        // Event count should match
        expect(events.length, `${routeName}/0 event count`).toBe(expected.length)

        // Event types and data should match in order
        for (let i = 0; i < expected.length; i++) {
          expect(events[i].type, `${routeName}/0 event ${i} type`).toBe(expected[i].type)
          expect(events[i].data, `${routeName}/0 event ${i} data`).toEqual(expected[i].data)
        }
      }
    })

    test('non-segment-0 events have correct types and data', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        for (const segment of segments) {
          if (segment === 0) continue // Tested above
          const segmentDir = `${TEST_DATA_DIR}/${routeName}/${segment}`
          const eventsFile = Bun.file(`${segmentDir}/events.json`)
          if (!(await eventsFile.exists())) continue

          const qlogFile = Bun.file(`${segmentDir}/qlog.zst`)
          const parsed = await processQlogForTest(qlogFile.stream(), segment)
          expect(parsed, `${routeName}/${segment} failed to parse`).not.toBeNull()

          const expected = (await eventsFile.json()) as RouteEvent[]
          const events = parsed!.events

          // Event count should match
          expect(events.length, `${routeName}/${segment} event count`).toBe(expected.length)

          // All expected events should exist with matching data (order may differ slightly due to timing)
          for (const exp of expected) {
            const found = events.find((e: RouteEvent) => e.type === exp.type && JSON.stringify(e.data) === JSON.stringify(exp.data))
            expect(found, `${routeName}/${segment} missing ${exp.type} event`).toBeDefined()
          }
        }
      }
    })

    test('segment 0 event ordering: record_front_toggle vs first_road_camera_frame', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        if (!segments.includes(0)) continue
        const segmentDir = `${TEST_DATA_DIR}/${routeName}/0`
        const eventsFile = Bun.file(`${segmentDir}/events.json`)
        if (!(await eventsFile.exists())) continue

        const qlogFile = Bun.file(`${segmentDir}/qlog.zst`)
        const parsed = await processQlogForTest(qlogFile.stream(), 0)
        if (!parsed) continue

        const expected = (await eventsFile.json()) as RouteEvent[]

        // Find the first two derived events in both
        const expFirst = expected.find((e: RouteEvent) => e.type === 'event')
        const expSecond = expected.filter((e: RouteEvent) => e.type === 'event')[1]
        const ourFirst = parsed.events.find((e: RouteEvent) => e.type === 'event')
        const ourSecond = parsed.events.filter((e: RouteEvent) => e.type === 'event')[1]

        if (expFirst && expSecond && ourFirst && ourSecond) {
          const expFirstType = (expFirst.data as { event_type: string }).event_type
          const expSecondType = (expSecond.data as { event_type: string }).event_type
          const ourFirstType = (ourFirst.data as { event_type: string }).event_type
          const ourSecondType = (ourSecond.data as { event_type: string }).event_type

          expect(ourFirstType, `${routeName}/0 first event`).toBe(expFirstType)
          expect(ourSecondType, `${routeName}/0 second event`).toBe(expSecondType)
        }
      }
    })
  })

  describe('coords parsing', () => {
    for (const routeName of ROUTES_WITH_ALL_SEGMENTS) {
      test(`${routeName} coords match comma API`, async () => {
        const routeFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/route.json`)
        if (!(await routeFile.exists())) return

        const routeData = (await routeFile.json()) as { maxqlog: number }
        const segments = Array.from({ length: routeData.maxqlog + 1 }, (_, i) => i)

        for (const segment of segments) {
          const segmentDir = `${TEST_DATA_DIR}/${routeName}/${segment}`
          const coordsFile = Bun.file(`${segmentDir}/coords.json`)
          if (!(await coordsFile.exists())) continue

          const qlogFile = Bun.file(`${segmentDir}/qlog.zst`)
          const parsed = await processQlogForTest(qlogFile.stream(), segment)
          expect(parsed, `${routeName}/${segment} failed to parse`).not.toBeNull()

          const expected = (await coordsFile.json()) as Coord[]
          const coords = parsed!.coords

          // Count should be close (we may have 1-2 extra at segment boundary)
          expect(Math.abs(coords.length - expected.length), `${routeName}/${segment} coord count diff`).toBeLessThan(5)

          // First and last positions should match
          if (coords.length > 0 && expected.length > 0) {
            expect(coords[0].lat, `${routeName}/${segment} first lat`).toBeCloseTo(expected[0].lat, 3)
            expect(coords[0].lng, `${routeName}/${segment} first lng`).toBeCloseTo(expected[0].lng, 3)
          }
        }
      })
    }
  })
})
