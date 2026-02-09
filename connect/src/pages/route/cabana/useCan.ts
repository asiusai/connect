import { useRef, useEffect } from 'react'
import { CanFrame, CanMessage, MessageFrames } from './types'
import { useCabanaStore } from './store'
import { usePlayerStore } from '../../../hooks/usePlayerStore'
import { toSeconds } from '../../../templates/shared'

// Binary search to find the index of the last frame <= targetTime
const findFrameIndex = (frames: CanFrame[], targetTimeMs: number): number => {
  let low = 0
  let high = frames.length - 1
  let result = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (frames[mid].timestamp <= targetTimeMs) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}

// Compute messages state at a given time
export const computeMessagesAtTime = (allFrames: Map<string, MessageFrames>, timeMs: number): Map<string, CanMessage> => {
  const messages = new Map<string, CanMessage>()

  for (const [key, mf] of allFrames) {
    const idx = findFrameIndex(mf.frames, timeMs)
    if (idx < 0) continue // No frames yet at this time

    const currentFrame = mf.frames[idx]

    // Get recent frames around current time for history
    const startIdx = Math.max(0, idx - 19)
    const recentFrames = mf.frames.slice(startIdx, idx + 1)

    messages.set(key, {
      key: mf.key,
      address: mf.address,
      src: mf.src,
      count: idx + 1, // Frames seen up to this point
      frequency: mf.frequency,
      lastData: currentFrame.data,
      recentFrames,
      bitChanges: mf.bitChanges,
    })
  }

  return messages
}

// Helper to get current time from player
const getCurrentTimeMs = () => {
  const frame = usePlayerStore.getState().frame
  return frame ? toSeconds(frame) * 1000 : 0
}

export const useCan = (logUrls: string[] | undefined) => {
  const set = useCabanaStore((s) => s.set)
  const workerRef = useRef<Worker | null>(null)
  // Keep frames in a ref to avoid re-renders during streaming
  const allFramesRef = useRef<Map<string, MessageFrames>>(new Map())

  // Initialize worker and load data
  useEffect(() => {
    if (!logUrls || logUrls.length === 0) return

    allFramesRef.current = new Map()
    set({ allFrames: new Map(), messages: new Map(), loading: true, progress: 0, carFingerprint: undefined })

    let lastTimeMs = -1
    const updateMessages = (timeMs: number) => {
      if (allFramesRef.current.size === 0) return
      // Skip if time hasn't changed significantly (within 50ms)
      if (Math.abs(timeMs - lastTimeMs) < 50) return
      lastTimeMs = timeMs
      const messages = computeMessagesAtTime(allFramesRef.current, timeMs)
      set({ messages, currentTimeMs: timeMs })
    }

    // Create worker
    const worker = new Worker(new URL('./can.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data

      if (msg.type === 'progress') {
        set({ progress: msg.eventCount })
      } else if (msg.type === 'carFingerprint') {
        set({ carFingerprint: msg.fingerprint })
      } else if (msg.type === 'frames') {
        // Merge into ref (no re-render)
        for (const [key, value] of Object.entries(msg.frames)) {
          const mf = value as any
          allFramesRef.current.set(key, {
            key: mf.key,
            address: mf.address,
            src: mf.src,
            frames: mf.frames.map((f: any) => ({
              ...f,
              data: new Uint8Array(f.data),
            })),
            bitChanges: mf.bitChanges,
            frequency: mf.frequency,
          })
        }
        // Update messages for current time
        updateMessages(getCurrentTimeMs())
      } else if (msg.type === 'done') {
        // Sync ref to store for persistence
        set({ allFrames: new Map(allFramesRef.current), loading: false })
      } else if (msg.type === 'error') {
        console.error('CAN worker error:', msg.error)
        set({ loading: false })
      }
    }

    worker.onerror = (err) => {
      console.error('CAN worker error:', err)
      set({ loading: false })
    }

    // Subscribe to player time changes (outside React render cycle)
    // Throttle to ~4fps to avoid overwhelming the UI
    let lastUpdateTime = 0
    let pendingUpdate: number | null = null
    const THROTTLE_MS = 250

    const throttledUpdate = (timeMs: number) => {
      const now = Date.now()
      if (now - lastUpdateTime >= THROTTLE_MS) {
        lastUpdateTime = now
        updateMessages(timeMs)
      } else if (!pendingUpdate) {
        pendingUpdate = window.setTimeout(
          () => {
            pendingUpdate = null
            lastUpdateTime = Date.now()
            updateMessages(getCurrentTimeMs())
          },
          THROTTLE_MS - (now - lastUpdateTime),
        )
      }
    }

    const unsubscribe = usePlayerStore.subscribe((state, prevState) => {
      if (state.frame !== prevState.frame) {
        throttledUpdate(state.frame ? toSeconds(state.frame) * 1000 : 0)
      }
    })

    // Start processing all log files
    worker.postMessage({ type: 'start', logUrls })

    return () => {
      unsubscribe()
      if (pendingUpdate) clearTimeout(pendingUpdate)
      worker.postMessage({ type: 'stop' })
      worker.terminate()
      workerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logUrls?.length, logUrls?.[0], set])
}
