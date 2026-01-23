import { useState, useRef, useCallback, useEffect } from 'react'
import { z } from 'zod'
import { UploadQueueItem, useAthena } from '../api/athena'

export type UploadProgress = z.infer<typeof UploadQueueItem>
export type UploadProgressInfo = ReturnType<typeof useUploadProgress>

export const useUploadProgress = (dongleId: string, routeId: string, onComplete?: () => void, enabled = true) => {
  const [queue, setQueue] = useState<UploadProgress[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const prevQueueIdsRef = useRef<Set<string>>(new Set())
  const athena = useAthena()
  const fetchQueue = useCallback(async () => {
    if (!enabled || !dongleId) return
    setIsLoading(true)
    try {
      const result = await athena('listUploadQueue', undefined)
      if (result?.result) {
        // Filter to only include items for this route
        const routeItems = result.result.filter((item) => item.path.includes(routeId))
        const currentIds = new Set(routeItems.map((item) => item.id))

        // Check if any items completed (were in prev queue but not in current)
        const prevIds = prevQueueIdsRef.current
        if (prevIds.size > 0) {
          const completedIds = [...prevIds].filter((id) => !currentIds.has(id))
          if (completedIds.length > 0 && onComplete) {
            // Delay slightly to allow server to process
            setTimeout(onComplete, 500)
          }
        }
        prevQueueIdsRef.current = currentIds

        setQueue(routeItems)
      }
    } catch (error) {
      console.error('Failed to fetch upload queue:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dongleId, routeId, enabled, onComplete])

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchQueue()

    // Poll every 2 seconds
    const interval = setInterval(fetchQueue, 10_000)
    return () => clearInterval(interval)
  }, [fetchQueue, enabled])

  // Helper to check if a specific segment/file is uploading
  const isUploading = useCallback(
    (segment: number, fileName?: string) => {
      return queue.some((item) => {
        const pathMatch = item.path.includes(`--${segment}/`)
        if (!fileName) return pathMatch
        return pathMatch && item.path.includes(fileName)
      })
    },
    [queue],
  )

  // Helper to get progress for a specific segment/file
  const getProgress = useCallback(
    (segment: number, fileName?: string) => {
      const item = queue.find((item) => {
        const pathMatch = item.path.includes(`--${segment}/`)
        if (!fileName) return pathMatch
        return pathMatch && item.path.includes(fileName)
      })
      return item?.progress
    },
    [queue],
  )

  // Get the currently uploading item
  const currentUpload = queue.find((item) => item.current)

  return {
    queue,
    isLoading,
    refetch: fetchQueue,
    isUploading,
    getProgress,
    currentUpload,
  }
}
