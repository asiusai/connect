import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams as useParamsRouter } from 'react-router-dom'
import { UploadQueueItem, useAthena } from '../api/athena'
import { z } from 'zod'
import { api } from '../api'
import { isSignedIn } from './helpers'
import { env } from './env'

let isOwner = false

export const getIsDeviceOwner = () => isOwner

export const useIsDeviceOwner = () => {
  const { dongleId } = useRouteParams()
  const [device] = api.device.get.useQuery({ params: { dongleId }, enabled: isSignedIn() })
  const [user] = api.auth.me.useQuery({})

  // Konik for some reason always returns is_owner=false
  isOwner = env.MODE === 'konik' || !!device?.is_owner || !!user?.superuser
  return isOwner
}

type Dimensions = { width: number; height: number }
const getDimensions = (): Dimensions => (typeof window === 'undefined' ? { width: 0, height: 0 } : { width: window.innerWidth, height: window.innerHeight })
export const useDimensions = (): Dimensions => {
  const [dimensions, setDimensions] = useState(getDimensions())

  useEffect(() => {
    const onResize = () => setDimensions(getDimensions())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return dimensions
}

export const useRouteParams = () => {
  const { dongleId, date, start, end } = useParamsRouter()
  return {
    dongleId: dongleId!,
    date: date!,
    routeName: `${dongleId}/${date}`,
    start: start ? Number(start) : undefined,
    end: end ? Number(end) : undefined,
  }
}

export const useAsyncEffect = (fn: () => Promise<any>, args: any[]) => {
  useEffect(() => {
    fn()
  }, [...args])
}

type UseAsyncMemo = {
  <T>(fn: () => Promise<T>, deps: any[], def: T): T
  <T>(fn: () => Promise<T>, deps: any[]): T | undefined
}
export const useAsyncMemo: UseAsyncMemo = <T>(fn: () => Promise<T>, deps: any[], def?: T) => {
  const [state, setState] = useState<T | undefined>(def)

  useAsyncEffect(async () => {
    const res = await fn()
    setState(res)
  }, deps)

  return state as T
}

export const useScroll = () => {
  const [scroll, setScroll] = useState(1)

  useEffect(() => {
    const onScroll = () => setScroll(window.scrollY)

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scroll
}

export type UploadProgress = z.infer<typeof UploadQueueItem>

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
