import { describe, expect, test, setDefaultTimeout, mock } from 'bun:test'
import { readdir } from 'fs/promises'
import { readLogs } from './reader'
import { LogReader } from './index'

setDefaultTimeout(60000)

const mockFetch = (stream: ReadableStream<Uint8Array>) => {
  return mock(async () => new Response(stream, { status: 200 })) as unknown as typeof fetch
}

const TEST_DATA_DIR = import.meta.dir + '/../../../example-data'

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

describe('player log reader', () => {
  test('discovers test data', async () => {
    const routes = await discoverRoutes()
    expect(routes.size).toBeGreaterThan(0)
  })

  describe('time-based frame indexing', () => {
    test('parses qlog and returns frames keyed by time offset in ms', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        if (!segments.includes(0)) continue
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        if (!(await qlogFile.exists())) continue

        const originalFetch = globalThis.fetch
        globalThis.fetch = mockFetch(qlogFile.stream())

        try {
          const result = await readLogs({ url: 'mock://qlog' })
          const timeOffsets = Object.keys(result.frames).map(Number)

          // Should have frames
          expect(timeOffsets.length, `${routeName}/0 should have frames`).toBeGreaterThan(0)

          // Time offsets should be in milliseconds (reasonable range for 60s segment)
          const minOffset = Math.min(...timeOffsets)
          const maxOffset = Math.max(...timeOffsets)

          // First frame should be near start (within first ~10s due to model warmup)
          expect(minOffset, 'first frame should be within first 10s').toBeLessThan(10000)

          // Last frame should be near end of 60s segment
          expect(maxOffset, 'last frame should be near end of segment').toBeGreaterThan(55000)
          expect(maxOffset, 'last frame should not exceed segment').toBeLessThan(65000)
        } finally {
          globalThis.fetch = originalFetch
        }

        break
      }
    })

    test('frames are evenly distributed across segment duration', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        if (!segments.includes(0)) continue
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        if (!(await qlogFile.exists())) continue

        const originalFetch = globalThis.fetch
        globalThis.fetch = mockFetch(qlogFile.stream())

        try {
          const result = await readLogs({ url: 'mock://qlog' })
          const timeOffsets = Object.keys(result.frames)
            .map(Number)
            .sort((a, b) => a - b)

          // Check we have frames throughout the segment
          // Should have at least 2 frames per second (model runs at ~10-20 Hz)
          expect(timeOffsets.length, 'should have enough frames').toBeGreaterThan(60)

          // Check distribution - frames should exist in first 10s, middle, and last 10s
          const first10s = timeOffsets.filter((t) => t < 10000)
          const middle = timeOffsets.filter((t) => t >= 25000 && t < 35000)
          const last10s = timeOffsets.filter((t) => t >= 50000)

          expect(first10s.length, 'should have frames in first 10s').toBeGreaterThan(0)
          expect(middle.length, 'should have frames in middle').toBeGreaterThan(0)
          expect(last10s.length, 'should have frames in last 10s').toBeGreaterThan(0)
        } finally {
          globalThis.fetch = originalFetch
        }

        break
      }
    })

    test('frame data contains expected fields', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        if (!segments.includes(0)) continue
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        if (!(await qlogFile.exists())) continue

        const originalFetch = globalThis.fetch
        globalThis.fetch = mockFetch(qlogFile.stream())

        try {
          const result = await readLogs({ url: 'mock://qlog' })
          const timeOffsets = Object.keys(result.frames)
            .map(Number)
            .sort((a, b) => a - b)

          // Should have DrivingModelData (qlogs don't have ModelV2)
          expect(timeOffsets.length).toBeGreaterThan(0)

          // Check first frame has expected structure
          const firstFrame = result.frames[timeOffsets[0]]
          expect(firstFrame.event).toBe('DrivingModelData')

          // Should have CarState after some frames (it accumulates)
          const lastFrame = result.frames[timeOffsets[timeOffsets.length - 1]]
          expect(lastFrame.CarState).toBeDefined()
          expect(typeof lastFrame.CarState?.VEgo).toBe('number')
        } finally {
          globalThis.fetch = originalFetch
        }

        break
      }
    })
  })

  describe('video sync accuracy', () => {
    test('time offset matches RoadCameraState timing', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        if (!segments.includes(0)) continue
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        if (!(await qlogFile.exists())) continue

        // Get video start time directly from logs
        let videoStartTimeNs: bigint | undefined
        let firstDrivingModelTimeNs: bigint | undefined

        for await (const event of LogReader(qlogFile.stream())) {
          if ('RoadCameraState' in event && videoStartTimeNs === undefined) {
            videoStartTimeNs = BigInt(event.RoadCameraState.TimestampEof)
          }
          if ('DrivingModelData' in event && firstDrivingModelTimeNs === undefined) {
            firstDrivingModelTimeNs = BigInt(event.LogMonoTime)
          }
          if (videoStartTimeNs !== undefined && firstDrivingModelTimeNs !== undefined) break
        }

        expect(videoStartTimeNs).toBeDefined()
        expect(firstDrivingModelTimeNs).toBeDefined()

        // Calculate expected offset
        const expectedOffsetMs = Number((firstDrivingModelTimeNs! - videoStartTimeNs!) / 1_000_000n)

        // Parse with our reader and check first frame's time offset
        const originalFetch = globalThis.fetch
        globalThis.fetch = mockFetch(Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`).stream())
        const result = await readLogs({ url: 'mock://qlog' })
        globalThis.fetch = originalFetch

        const timeOffsets = Object.keys(result.frames)
          .map(Number)
          .sort((a, b) => a - b)
        const firstOffset = timeOffsets[0]

        // First frame offset should match expected (within 10ms tolerance)
        expect(Math.abs(firstOffset - expectedOffsetMs), 'first frame offset should match').toBeLessThan(10)
        break
      }
    })
  })

  describe('truncated qlog handling', () => {
    test('handles truncated qlog files gracefully', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        // Find last segment which may be truncated
        const lastSegment = Math.max(...segments)
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/${lastSegment}/qlog.zst`)
        if (!(await qlogFile.exists())) continue

        const originalFetch = globalThis.fetch
        globalThis.fetch = mockFetch(qlogFile.stream())

        try {
          // Should not throw even if file is truncated
          const result = await readLogs({ url: 'mock://qlog' })

          // Should still have some frames from partial data
          const timeOffsets = Object.keys(result.frames).map(Number)
          expect(timeOffsets.length, `${routeName}/${lastSegment} should have frames from partial data`).toBeGreaterThan(0)
        } finally {
          globalThis.fetch = originalFetch
        }

        break
      }
    })
  })

  describe('DrivingModelData vs ModelV2', () => {
    test('qlogs contain DrivingModelData but not ModelV2', async () => {
      const routes = await discoverRoutes()

      for (const [routeName, segments] of routes) {
        if (!segments.includes(0)) continue
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${routeName}/0/qlog.zst`)
        if (!(await qlogFile.exists())) continue

        let hasDrivingModelData = false
        let hasModelV2 = false

        for await (const event of LogReader(qlogFile.stream())) {
          if ('DrivingModelData' in event) hasDrivingModelData = true
          if ('ModelV2' in event) hasModelV2 = true
        }

        expect(hasDrivingModelData, `${routeName}/0 should have DrivingModelData`).toBe(true)
        expect(hasModelV2, `${routeName}/0 should NOT have ModelV2 (qlogs)`).toBe(false)
        break
      }
    })
  })
})
