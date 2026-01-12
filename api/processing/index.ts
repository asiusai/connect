import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { segmentsTable, routesTable } from '../db/schema'
import { mkv } from '../mkv'
import { processQlogStreaming, type StreamingQlogResult } from './qlogs'
import { extractSprite } from './qcamera'

// Creates a passthrough stream that can be written to and read from
const createPassthroughStream = () => {
  let controller: ReadableStreamDefaultController<Uint8Array>
  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      controller.enqueue(chunk)
    },
    close() {
      controller.close()
    },
  })
  return { readable, writable }
}

const processSegmentQlogStreaming = async (dongleId: string, routeId: string, segment: number): Promise<StreamingQlogResult | null> => {
  const key = `${dongleId}/${routeId}/${segment}/qlog.zst`
  const res = await mkv.get(key)
  if (!res.ok || !res.body) return null

  const baseKey = `${dongleId}/${routeId}/${segment}`

  // For non-zero segments, get segment 0's mono_start_time for route_offset_millis calculation
  let routeStartMonoTime: string | undefined
  if (segment !== 0) {
    const seg0 = await db.query.segmentsTable.findFirst({
      where: and(eq(segmentsTable.dongle_id, dongleId), eq(segmentsTable.route_id, routeId), eq(segmentsTable.segment, 0)),
      columns: { mono_start_time: true },
    })
    routeStartMonoTime = seg0?.mono_start_time ?? undefined
  }

  // Create passthrough streams for events and coords
  const eventsPassthrough = createPassthroughStream()
  const coordsPassthrough = createPassthroughStream()

  // Start uploading to MKV in parallel with processing
  const eventsUpload = mkv.put(`${baseKey}/events.json`, eventsPassthrough.readable, { 'Content-Type': 'application/json' }, true)
  const coordsUpload = mkv.put(`${baseKey}/coords.json`, coordsPassthrough.readable, { 'Content-Type': 'application/json' }, true)

  // Process the qlog, streaming output to the passthrough streams
  const result = await processQlogStreaming(res.body, segment, eventsPassthrough.writable, coordsPassthrough.writable, dongleId, routeId, routeStartMonoTime)

  // Wait for uploads to complete
  await Promise.all([eventsUpload, coordsUpload])

  return result
}

const processSegmentQcamera = async (dongleId: string, routeId: string, segment: number): Promise<void> => {
  const baseKey = `${dongleId}/${routeId}/${segment}`

  const res = await mkv.get(`${baseKey}/qcamera.ts`)
  if (!res.ok || !res.body) return

  const sprite = await extractSprite(res.body)
  if (!sprite) return

  const blob = new Blob([sprite as BlobPart], { type: 'image/jpeg' })
  await mkv.put(`${baseKey}/sprite.jpg`, blob.stream(), { 'Content-Type': 'image/jpeg' }, true)
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
    const data = await processSegmentQlogStreaming(dongleId, routeId, segment)

    // Upsert segment with data from streaming result
    const segmentData = {
      start_time: data?.firstGps?.UnixTimestampMillis ? Number(data.firstGps.UnixTimestampMillis) : null,
      end_time: data?.lastGps?.UnixTimestampMillis ? Number(data.lastGps.UnixTimestampMillis) : null,
      mono_start_time: data?.monoStartTime ?? null,
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
    await processSegmentQcamera(dongleId, routeId, segment)
  }
}
