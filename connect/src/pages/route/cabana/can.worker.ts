import { LogReader } from '../../../../../shared/log-reader'

declare const self: Worker

type CanFrameData = {
  address: number
  data: number[] // Use array instead of Uint8Array for serialization
  src: number
  timestamp: number
}

type MessageFramesData = {
  key: string
  address: number
  src: number
  frames: CanFrameData[]
  bitChanges: number[]
  frequency: number
}

type WorkerMessage = { type: 'start'; logUrls: string[] } | { type: 'stop' }

type WorkerResponse =
  | { type: 'started' }
  | { type: 'progress'; segmentIndex: number; totalSegments: number; eventCount: number; messageCount: number }
  | { type: 'carFingerprint'; fingerprint: string }
  | { type: 'frames'; frames: Record<string, MessageFramesData> } // Incremental frame updates
  | { type: 'done' }
  | { type: 'error'; error: string }

const SEGMENT_DURATION_MS = 60_000 // Each segment is ~60 seconds

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const calculateBitChanges = (frames: CanFrameData[]): number[] => {
  const changes = new Array(64).fill(0)
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1].data
    const curr = frames[i].data
    const len = Math.min(prev.length, curr.length)
    for (let byteIdx = 0; byteIdx < len; byteIdx++) {
      const diff = prev[byteIdx] ^ curr[byteIdx]
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        if (diff & (1 << bitIdx)) {
          changes[byteIdx * 8 + bitIdx]++
        }
      }
    }
  }
  return changes
}

let abortController: AbortController | null = null

const BATCH_INTERVAL_MS = 250 // Send updates every 250ms

const processLogs = async (logUrls: string[]) => {
  abortController = new AbortController()
  const allFrames = new Map<string, MessageFramesData>()
  let totalEventCount = 0
  let carFingerprintFound = false
  let lastBatchTime = Date.now()
  let pendingUpdates = new Map<string, MessageFramesData>()

  const flushUpdates = () => {
    if (pendingUpdates.size === 0) return

    // Calculate bit changes and frequencies for pending updates
    for (const mf of pendingUpdates.values()) {
      mf.bitChanges = calculateBitChanges(mf.frames)
      if (mf.frames.length >= 2) {
        const duration = mf.frames[mf.frames.length - 1].timestamp - mf.frames[0].timestamp
        if (duration > 0) {
          mf.frequency = Math.round(((mf.frames.length - 1) / duration) * 1000)
        }
      }
    }

    const framesObj: Record<string, MessageFramesData> = {}
    for (const [key, value] of pendingUpdates) {
      framesObj[key] = value
    }
    self.postMessage({ type: 'frames', frames: framesObj } satisfies WorkerResponse)
    pendingUpdates = new Map()
    lastBatchTime = Date.now()
  }

  try {
    for (let segmentIndex = 0; segmentIndex < logUrls.length; segmentIndex++) {
      if (abortController.signal.aborted) break

      const logUrl = logUrls[segmentIndex]
      const segmentTimeOffset = segmentIndex * SEGMENT_DURATION_MS

      try {
        const res = await fetch(logUrl, { signal: abortController.signal })
        if (!res.ok || !res.body) {
          console.warn(`Failed to fetch segment ${segmentIndex}`)
          continue
        }

        const reader = LogReader(res.body)
        let segmentFirstTimestamp: number | undefined

        for await (const event of reader) {
          if (abortController.signal.aborted) break

          if (!carFingerprintFound && 'CarParams' in event && event.CarParams?.CarFingerprint) {
            self.postMessage({ type: 'carFingerprint', fingerprint: event.CarParams.CarFingerprint } satisfies WorkerResponse)
            carFingerprintFound = true
          }

          if (!('Can' in event) || !Array.isArray(event.Can)) continue

          const logMonoTime = event.LogMonoTime
          const timestamp = typeof logMonoTime === 'string' ? Number(BigInt(logMonoTime) / 1_000_000n) : Number(logMonoTime / 1_000_000)

          if (segmentFirstTimestamp === undefined) segmentFirstTimestamp = timestamp

          for (const canFrame of event.Can) {
            const address = canFrame.Address
            const src = canFrame.Src
            const key = `${address}-${src}`
            const data = Array.from(base64ToUint8Array(canFrame.Dat))

            // Calculate timestamp relative to start of route (segment offset + time within segment)
            const frameTimestamp = segmentTimeOffset + (timestamp - segmentFirstTimestamp)

            const frame: CanFrameData = {
              address,
              data,
              src,
              timestamp: frameTimestamp,
            }

            const existing = allFrames.get(key)
            if (existing) {
              existing.frames.push(frame)
              pendingUpdates.set(key, existing)
            } else {
              const newMsg: MessageFramesData = {
                key,
                address,
                src,
                frames: [frame],
                bitChanges: new Array(64).fill(0),
                frequency: 0,
              }
              allFrames.set(key, newMsg)
              pendingUpdates.set(key, newMsg)
            }
          }

          totalEventCount++

          // Batch updates every BATCH_INTERVAL_MS
          const now = Date.now()
          if (now - lastBatchTime >= BATCH_INTERVAL_MS) {
            flushUpdates()
            self.postMessage({
              type: 'progress',
              segmentIndex,
              totalSegments: logUrls.length,
              eventCount: totalEventCount,
              messageCount: allFrames.size,
            } satisfies WorkerResponse)
          }
        }
      } catch (segmentErr) {
        // Log segment error but continue with next segment (truncated files are common)
        if (segmentErr instanceof Error && segmentErr.message.includes('EOF')) {
          console.warn(`Segment ${segmentIndex} truncated, continuing...`)
        } else {
          console.warn(`Error processing segment ${segmentIndex}:`, segmentErr)
        }
      }

      // Flush after each segment
      flushUpdates()
    }

    if (abortController.signal.aborted) return

    // Final flush
    flushUpdates()
    self.postMessage({ type: 'done' } satisfies WorkerResponse)
  } catch (err) {
    if (abortController.signal.aborted) return
    if (err instanceof Error && err.message.includes('EOF')) {
      flushUpdates()
      self.postMessage({ type: 'done' } satisfies WorkerResponse)
      return
    }
    self.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse)
  }
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data

  if (msg.type === 'start') {
    self.postMessage({ type: 'started' } satisfies WorkerResponse)
    processLogs(msg.logUrls)
  } else if (msg.type === 'stop') {
    abortController?.abort()
  }
}
