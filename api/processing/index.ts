import { db } from '../db/client'
import { segmentsTable } from '../db/schema'
import { mkv } from '../mkv'
import { processQlogStream, type SegmentQlogData } from './qlogs'
import { extractSprite } from './qcamera'

export { startQueueWorker, stopQueueWorker, queueFile, getQueueStats } from './queue'

const saveJson = async (key: string, data: unknown): Promise<void> => {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  await mkv.put(key, blob.stream(), { 'Content-Type': 'application/json' }, true)
}

const processSegmentQlog = async (dongleId: string, routeId: string, segment: number): Promise<SegmentQlogData | null> => {
  const key = `${dongleId}/${routeId}/${segment}/qlog.zst`
  const res = await mkv.get(key)
  if (!res.ok || !res.body) return null

  return processQlogStream(res.body, segment, dongleId, routeId)
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

  const baseKey = `${dongleId}/${routeId}/${segment}`

  // Process qlog - this creates the segment record
  if (filename === 'qlog.zst' || filename === 'qlog') {
    const data = await processSegmentQlog(dongleId, routeId, segment)

    // Upsert segment
    const segmentData = {
      start_time: data?.firstGps?.UnixTimestampMillis ? Number(data.firstGps.UnixTimestampMillis) : null,
      end_time: data?.lastGps?.UnixTimestampMillis ? Number(data.lastGps.UnixTimestampMillis) : null,
      start_lat: data?.firstGps?.Latitude ?? null,
      start_lng: data?.firstGps?.Longitude ?? null,
      end_lat: data?.lastGps?.Latitude ?? null,
      end_lng: data?.lastGps?.Longitude ?? null,
      distance: data?.coords.length ? data.coords[data.coords.length - 1].dist : null,
      version: data?.metadata?.version ?? null,
      git_branch: data?.metadata?.gitBranch ?? null,
      git_commit: data?.metadata?.gitCommit ?? null,
      git_commit_date: data?.metadata?.gitCommitDate ?? null,
      git_dirty: data?.metadata?.gitDirty ?? null,
      git_remote: data?.metadata?.gitRemote ?? null,
      platform: data?.metadata?.carFingerprint ?? null,
      vin: data?.metadata?.vin ?? null,
    }
    await db
      .insert(segmentsTable)
      .values({ dongle_id: dongleId, route_id: routeId, segment, ...segmentData })
      .onConflictDoUpdate({
        target: [segmentsTable.dongle_id, segmentsTable.route_id, segmentsTable.segment],
        set: segmentData,
      })

    if (data) {
      await saveJson(`${baseKey}/events.json`, data.events)
      await saveJson(`${baseKey}/coords.json`, data.coords)
    }
  }

  // Process qcamera to extract sprite
  if (filename === 'qcamera.ts') {
    await processSegmentQcamera(dongleId, routeId, segment)
  }
}

export const processUploadedFile = async (dongleId: string, path: string) => {
  const { queueFile } = await import('./queue')
  await queueFile(`${dongleId}/${path}`)
}
