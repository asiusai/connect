import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { routesTable } from '../db/schema'
import { mkv } from '../mkv'
import { processQlogStream, type SegmentQlogData } from './qlogs'
import { extractSprite } from './qcamera'

type GpsLocation = {
  Latitude?: number
  Longitude?: number
  Speed?: number
  UnixTimestampMillis?: string
}

type RouteMetadata = {
  dongleId: string
  routeId: string
  version?: string
  gitCommit?: string
  gitBranch?: string
  gitRemote?: string
  gitDirty?: boolean
}

const saveJson = async (key: string, data: unknown): Promise<void> => {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  await mkv.put(key, blob.stream(), { 'Content-Type': 'application/json' })
}

const processSegmentQlog = async (dongleId: string, routeId: string, segment: number): Promise<SegmentQlogData | null> => {
  const key = `${dongleId}/${routeId}/${segment}/qlog.zst`
  const res = await mkv.get(key)
  if (!res.ok || !res.body) return null

  return processQlogStream(res.body, segment, dongleId, routeId)
}

const processSegmentQcamera = async (dongleId: string, routeId: string, segment: number): Promise<void> => {
  const baseKey = `${dongleId}/${routeId}/${segment}`

  // Check if sprite already exists
  const existingSprite = await mkv.get(`${baseKey}/sprite.jpg`)
  if (existingSprite.ok) return

  // Try qcamera.ts first, then qcamera
  let res = await mkv.get(`${baseKey}/qcamera.ts`)
  if (!res.ok || !res.body) return

  const sprite = await extractSprite(res.body)
  if (!sprite) return

  const blob = new Blob([sprite as BlobPart], { type: 'image/jpeg' })
  await mkv.put(`${baseKey}/sprite.jpg`, blob.stream(), { 'Content-Type': 'image/jpeg' })
}

export const processSegment = async (dongleId: string, routeId: string, segment: number): Promise<void> => {
  const baseKey = `${dongleId}/${routeId}/${segment}`

  // Process qlog if not already done
  const existingEvents = await mkv.get(`${baseKey}/events.json`)
  if (!existingEvents.ok) {
    const data = await processSegmentQlog(dongleId, routeId, segment)
    if (data) {
      await saveJson(`${baseKey}/events.json`, data.events)
      await saveJson(`${baseKey}/coords.json`, data.coords)
    }
  }

  // Process qcamera
  await processSegmentQcamera(dongleId, routeId, segment)
}

export const processRoute = async (dongleId: string, routeId: string): Promise<boolean> => {
  const fullname = `${dongleId}|${routeId}`

  // Get segment count by listing files
  const files = await mkv.list(`${dongleId}/${routeId}`)
  const segments = new Set(files.map((f) => f.split('/')[0]).filter((s) => /^\d+$/.test(s)))
  const segmentNumbers = Array.from(segments)
    .map(Number)
    .sort((a, b) => a - b)
  const maxSegment = segmentNumbers.length > 0 ? Math.max(...segmentNumbers) : 0

  // Process all segments to generate events.json, coords.json, and sprite.jpg
  let metadata: RouteMetadata | null = null
  let firstGps: GpsLocation | null = null
  let lastGps: GpsLocation | null = null
  let totalDistance = 0

  for (const segment of segmentNumbers) {
    const data = await processSegmentQlog(dongleId, routeId, segment)
    if (data) {
      // Save events.json and coords.json for this segment
      const baseKey = `${dongleId}/${routeId}/${segment}`
      await saveJson(`${baseKey}/events.json`, data.events)
      await saveJson(`${baseKey}/coords.json`, data.coords)

      // Collect metadata from segment 0
      if (segment === 0 && data.metadata) metadata = data.metadata
      if (!firstGps && data.firstGps) firstGps = data.firstGps
      if (data.lastGps) lastGps = data.lastGps
      if (data.coords.length > 0) totalDistance = data.coords[data.coords.length - 1].dist
    }

    // Process qcamera for sprite
    await processSegmentQcamera(dongleId, routeId, segment)
  }

  // Check if route already exists
  const existing = await db.query.routesTable.findFirst({
    where: (routes, { eq }) => eq(routes.fullname, fullname),
  })

  const routeData = {
    fullname,
    dongle_id: dongleId,
    version: metadata?.version ?? null,
    git_commit: metadata?.gitCommit ?? null,
    git_branch: metadata?.gitBranch ?? null,
    git_remote: metadata?.gitRemote ?? null,
    git_dirty: metadata?.gitDirty ?? null,
    start_lat: firstGps?.Latitude ?? null,
    start_lng: firstGps?.Longitude ?? null,
    start_time: firstGps?.UnixTimestampMillis ? new Date(Number(firstGps.UnixTimestampMillis)).toISOString() : null,
    end_lat: lastGps?.Latitude ?? null,
    end_lng: lastGps?.Longitude ?? null,
    end_time: lastGps?.UnixTimestampMillis ? new Date(Number(lastGps.UnixTimestampMillis)).toISOString() : null,
    distance: totalDistance,
    maxqlog: maxSegment,
    procqlog: maxSegment,
    is_public: false,
    is_preserved: false,
  }

  if (existing) {
    await db.update(routesTable).set(routeData).where(eq(routesTable.fullname, fullname))
  } else {
    await db.insert(routesTable).values(routeData)
  }

  return true
}

export const processUploadedFile = async (dongleId: string, path: string): Promise<void> => {
  // Path format: routeId/segment/filename or routeId/filename
  const parts = path.split('/')
  if (parts.length < 2) return

  const routeId = parts[0]

  // Only process on qlog upload (first segment triggers route creation)
  const filename = parts[parts.length - 1]
  if (filename !== 'qlog.zst' && filename !== 'qlog') return

  // Check if this looks like a route ID
  // Formats: 2024-01-01--12-34-56 (date) or 00000031--2b1a66d680 (hex)
  if (!/^(\d{4}-\d{2}-\d{2}--\d{2}-\d{2}-\d{2}|[0-9a-f]{8}--[0-9a-f]{10})/.test(routeId)) return

  await processRoute(dongleId, routeId)
}
