import { describe, expect, test } from 'bun:test'
import { processQlogStream, type RouteEvent, type Coord } from './qlogs'

const TEST_DATA_DIR = import.meta.dir + '/../../example-data'
const ROUTES = [
  { name: '9748a98e983e0b39_0000002c--d68dde99ca', segmentCount: 3, hasMetadata: true },
  { name: 'd2e453e372f4d0d4_00000042--67cdb4c4ee', segmentCount: 1, hasMetadata: false },
]

describe('qlogs', () => {
  for (const route of ROUTES) {
    if (route.hasMetadata) {
      test(`${route.name} metadata matches comma API`, async () => {
      const expected = (await Bun.file(`${TEST_DATA_DIR}/${route.name}.json`).json()) as {
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

      let metadata: {
        version?: string
        gitCommit?: string
        gitBranch?: string
        gitRemote?: string
        gitCommitDate?: string
        gitDirty?: boolean
        vin?: string
        carFingerprint?: string
      } | null = null
      let firstGps: { Latitude?: number; Longitude?: number } | null = null
      let lastGps: { Latitude?: number; Longitude?: number } | null = null
      let totalDistance = 0

      for (let segment = 0; segment < route.segmentCount; segment++) {
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${route.name}--${segment}--qlog.zst`)
        const result = await processQlogStream(qlogFile.stream(), segment)
        expect(result).not.toBeNull()

        if (segment === 0 && result!.metadata) metadata = result!.metadata
        if (!firstGps && result!.firstGps) firstGps = result!.firstGps
        if (result!.lastGps) lastGps = result!.lastGps
        if (result!.coords.length > 0) totalDistance += result!.coords[result!.coords.length - 1].dist
      }

      // Check metadata from segment 0
      expect(metadata?.version).toBe(expected.version)
      expect(metadata?.gitCommit).toBe(expected.git_commit)
      expect(metadata?.gitBranch).toBe(expected.git_branch)
      expect(metadata?.gitRemote?.replace('https://', '')).toBe(expected.git_remote)
      expect(metadata?.gitCommitDate).toBe(expected.git_commit_date)
      expect(metadata?.gitDirty).toBe(expected.git_dirty)
      expect(metadata?.carFingerprint).toBe(expected.platform)
      expect(metadata?.vin).toBe(expected.vin)
      // make is derived from platform (first part before _)
      expect(metadata?.carFingerprint?.split('_')[0]?.toLowerCase()).toBe(expected.make)

      // Check GPS start/end coordinates (2 decimal places = ~1km accuracy)
      expect(firstGps?.Latitude).toBeCloseTo(expected.start_lat, 2)
      expect(firstGps?.Longitude).toBeCloseTo(expected.start_lng, 2)
      expect(lastGps?.Latitude).toBeCloseTo(expected.end_lat, 2)
      expect(lastGps?.Longitude).toBeCloseTo(expected.end_lng, 2)

      // TODO: this is still off too much
      // Check distance is reasonable (same order of magnitude)
      expect(totalDistance).toBeGreaterThan(0)
      expect(totalDistance).toBeLessThan(expected.distance * 2)
      })
    }

    for (let segment = 0; segment < route.segmentCount; segment++) {
      const prefix = `${route.name}--${segment}`

      test(`${prefix} events match comma API`, async () => {
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${prefix}--qlog.zst`)
        const expectedFile = Bun.file(`${TEST_DATA_DIR}/${prefix}--events.json`)

        const result = await processQlogStream(qlogFile.stream(), segment)
        expect(result).not.toBeNull()
        const { events } = result!
        const expected = (await expectedFile.json()) as RouteEvent[]

        expect(events.length).toBe(expected.length)

        for (let i = 0; i < expected.length; i++) {
          expect(events[i].type).toBe(expected[i].type)
          expect(events[i].data).toEqual(expected[i].data)
        }

        const recordFrontToggle = events.find((e) => e.type === 'event' && (e.data as any).event_type === 'record_front_toggle')
        const firstRoadCameraFrame = events.find((e) => e.type === 'event' && (e.data as any).event_type === 'first_road_camera_frame')
        expect(recordFrontToggle).toBeDefined()
        expect(firstRoadCameraFrame).toBeDefined()
      })

      test(`${prefix} coords match comma API`, async () => {
        const qlogFile = Bun.file(`${TEST_DATA_DIR}/${prefix}--qlog.zst`)
        const expectedFile = Bun.file(`${TEST_DATA_DIR}/${prefix}--coords.json`)

        const result = await processQlogStream(qlogFile.stream(), segment)
        expect(result).not.toBeNull()
        const { coords } = result!
        const expected = (await expectedFile.json()) as Coord[]

        expect(Math.abs(coords.length - expected.length)).toBeLessThan(5)

        if (coords.length > 0 && expected.length > 0) {
          expect(coords[0].lat).toBeCloseTo(expected[0].lat, 3)
          expect(coords[0].lng).toBeCloseTo(expected[0].lng, 3)
        }
      })
    }
  }

})
