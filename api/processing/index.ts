import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { segmentsTable, routesTable, filesTable } from '../db/schema'
import { fs } from '../fs'
import { processQlogStreaming, type StreamingQlogResult } from './qlogs'
import { extractSprite } from './qcamera'
import { remuxHevcToMp4 } from './hevc'

type QlogProcessingResult = {
  result: StreamingQlogResult
  routeStartTime: number | null // Segment 0's start_time (for calculating segment N start = routeStart + N*60s)
}

const processSegmentQlogStreaming = async (dongleId: string, routeId: string, segment: number): Promise<QlogProcessingResult | null> => {
  const key = `${dongleId}/${routeId}/${segment}/qlog.zst`
  const res = await fs.get(key)
  if (!res.ok || !res.body) throw new Error(`File not found: ${key}`)

  const contentLength = res.headers.get('content-length')
  if (contentLength === '0') throw new Error(`Empty file: ${key}`)

  // Buffer to temp file - Blob.stream() doesn't work correctly with zstd decompression
  const inputBuffer = await res.arrayBuffer()
  const tmpPath = `/tmp/qlog-${Date.now()}-${Math.random().toString(36).slice(2)}.zst`
  await Bun.write(tmpPath, inputBuffer)
  const inputStream = Bun.file(tmpPath).stream()

  const baseKey = `${dongleId}/${routeId}/${segment}`

  // For non-zero segments, get segment 0's data for route_offset_millis and start_time calculation
  let routeStartMonoTime: string | undefined
  let routeStartTime: number | null = null
  if (segment !== 0) {
    const seg0 = await db.query.segmentsTable.findFirst({
      where: and(eq(segmentsTable.dongle_id, dongleId), eq(segmentsTable.route_id, routeId), eq(segmentsTable.segment, 0)),
      columns: { mono_start_time: true, start_time: true },
    })
    routeStartMonoTime = seg0?.mono_start_time ?? undefined
    routeStartTime = seg0?.start_time ?? null
  }

  // Create in-memory buffers for events and coords
  const eventsChunks: Uint8Array[] = []
  const coordsChunks: Uint8Array[] = []

  const eventsWritable = new WritableStream<Uint8Array>({
    write(chunk) {
      eventsChunks.push(chunk)
    },
  })
  const coordsWritable = new WritableStream<Uint8Array>({
    write(chunk) {
      coordsChunks.push(chunk)
    },
  })

  // Process the qlog fully first, then upload
  const result = await processQlogStreaming(inputStream, segment, eventsWritable, coordsWritable, dongleId, routeId, routeStartMonoTime)

  // Upload events and coords after processing is complete
  const eventsBlob = new Blob(eventsChunks as BlobPart[], { type: 'application/json' })
  const coordsBlob = new Blob(coordsChunks as BlobPart[], { type: 'application/json' })
  await Promise.all([
    fs.put(`${baseKey}/events.json`, eventsBlob.stream(), { 'Content-Type': 'application/json' }, true),
    fs.put(`${baseKey}/coords.json`, coordsBlob.stream(), { 'Content-Type': 'application/json' }, true),
  ])

  // Track derived files in filesTable
  const parts = baseKey.split('/')
  for (const [file, size] of [
    ['events.json', eventsBlob.size],
    ['coords.json', coordsBlob.size],
  ] as const) {
    db.insert(filesTable)
      .values({ key: `${baseKey}/${file}`, dongle_id: parts[0], route_id: parts[1], segment: parseInt(parts[2], 10), file, size, processingStatus: 'done' })
      .onConflictDoUpdate({ target: filesTable.key, set: { size } })
      .run()
  }

  // Clean up temp file (fire and forget)
  import('fs/promises').then((fs) => fs.unlink(tmpPath)).catch(() => {})

  if (!result) throw new Error(`Failed to parse qlog: ${key}`)

  return { result, routeStartTime }
}

const processSegmentQcamera = async (dongleId: string, routeId: string, segment: number): Promise<void> => {
  const baseKey = `${dongleId}/${routeId}/${segment}`

  const res = await fs.get(`${baseKey}/qcamera.ts`)
  if (!res.ok || !res.body) throw new Error(`File not found: ${baseKey}/qcamera.ts`)

  const contentLength = res.headers.get('content-length')
  if (contentLength === '0') throw new Error(`Empty file: ${baseKey}/qcamera.ts`)

  const sprite = await extractSprite(res.body)
  if (!sprite) return

  const blob = new Blob([sprite as BlobPart], { type: 'image/jpeg' })
  await fs.put(`${baseKey}/sprite.jpg`, blob.stream(), { 'Content-Type': 'image/jpeg' }, true)

  // Track derived file in filesTable
  const parts = baseKey.split('/')
  db.insert(filesTable)
    .values({
      key: `${baseKey}/sprite.jpg`,
      dongle_id: parts[0],
      route_id: parts[1],
      segment: parseInt(parts[2], 10),
      file: 'sprite.jpg',
      size: blob.size,
      processingStatus: 'done',
    })
    .onConflictDoUpdate({ target: filesTable.key, set: { size: blob.size } })
    .run()
}

export const processFile = async (dongleId: string, path: string): Promise<void> => {
  // Path is already normalized to: routeId/segment/filename (e.g., 2025-01-07--12-00-00/0/qlog.zst)
  const parts = path.split('/')
  if (parts.length < 3) return

  const routeId = parts[0]
  const segment = parseInt(parts[1], 10)
  const filename = parts[parts.length - 1]

  if (Number.isNaN(segment)) return

  // Validate routeId format
  if (!/^(\d{4}-\d{2}-\d{2}--\d{2}-\d{2}-\d{2}|[0-9a-f]{8}--[0-9a-f]{10})$/.test(routeId)) return

  // Process qlog - this creates the segment record and streams events/coords to storage
  if (filename === 'qlog.zst' || filename === 'qlog') {
    const processed = await processSegmentQlogStreaming(dongleId, routeId, segment)
    const data = processed?.result
    const routeStartTime = processed?.routeStartTime

    // Upsert segment with data from streaming result
    // Comma uses fixed 60-second segments (1200 frames at 20fps):
    // - Segment 0: GPS time for start
    // - Segment N: routeStartTime + (N * 60000ms) for start (ensures continuous segments)
    // - Duration: 60s for full segments (>=1180 frames), actual frame duration for partial segments
    const gpsStartTime = data?.firstGps?.UnixTimestampMillis ? Number(data.firstGps.UnixTimestampMillis) : null
    const startTime = segment === 0 ? gpsStartTime : routeStartTime ? routeStartTime + segment * 60000 : gpsStartTime
    // Full segment = 1200 frames (60s * 20fps), allow some tolerance
    // If frameCount is 0 (truncated file with no camera frames), default to 60s
    const frameCount = data?.frameCount || 0
    const isFullSegment = frameCount >= 1180
    const durationMs = isFullSegment || frameCount === 0 ? 60000 : (frameCount / 20) * 1000
    const endTime = startTime ? startTime + durationMs : null

    const segmentData = {
      start_time: startTime,
      end_time: endTime,
      start_lat: data?.firstGps?.Latitude ?? null,
      start_lng: data?.firstGps?.Longitude ?? null,
      end_lat: data?.lastGps?.Latitude ?? null,
      end_lng: data?.lastGps?.Longitude ?? null,
      distance: data?.totalDistance ?? null,
      version: data?.metadata?.version ?? null,
      git_branch: data?.metadata?.gitBranch ?? null,
      git_commit: data?.metadata?.gitCommit ?? null,
      git_commit_date: data?.metadata?.gitCommitDate ?? null,
      git_dirty: data?.metadata?.gitDirty ?? null,
      git_remote: data?.metadata?.gitRemote ?? null,
      platform: data?.metadata?.carFingerprint ?? null,
      vin: data?.metadata?.vin ?? null,
    }

    // Create route entry if it doesn't exist
    await db.insert(routesTable).values({ dongle_id: dongleId, route_id: routeId }).onConflictDoNothing()

    await db
      .insert(segmentsTable)
      .values({ dongle_id: dongleId, route_id: routeId, segment, ...segmentData })
      .onConflictDoUpdate({
        target: [segmentsTable.dongle_id, segmentsTable.route_id, segmentsTable.segment],
        set: segmentData,
      })
  }

  // Process qcamera to extract sprite
  if (filename === 'qcamera.ts') {
    // Create route and segment if they don't exist (in case qlog wasn't uploaded)
    await db.insert(routesTable).values({ dongle_id: dongleId, route_id: routeId }).onConflictDoNothing()
    await db.insert(segmentsTable).values({ dongle_id: dongleId, route_id: routeId, segment }).onConflictDoNothing()

    await processSegmentQcamera(dongleId, routeId, segment)
  }

  // Process HEVC files - remux to MP4 for instant browser playback
  // Keep .hevc extension to avoid breaking other things
  if (filename.endsWith('.hevc')) {
    const key = `${dongleId}/${routeId}/${segment}/${filename}`
    const res = await fs.get(key)
    if (!res.ok || !res.body) throw new Error(`File not found: ${key}`)

    const contentLength = res.headers.get('content-length')
    if (contentLength === '0') throw new Error(`Empty file: ${key}`)

    const mp4Stream = await remuxHevcToMp4(res.body)
    const putRes = await fs.put(key, mp4Stream, { 'Content-Type': 'video/mp4' }, true)

    // Update file size in filesTable after remux
    const newSize = parseInt(putRes.headers.get('Content-Length') || '0', 10)
    if (newSize > 0) db.update(filesTable).set({ size: newSize }).where(eq(filesTable.key, key)).run()
  }
}
