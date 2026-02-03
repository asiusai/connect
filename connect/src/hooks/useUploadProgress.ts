import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { ZustandType } from '../../../shared/helpers'
import { UploadQueueItem } from '../../../shared/athena'
import { useRouteParams } from '.'
import { useIsDeviceOwner } from './useIsDeviceOwner'
import { useDevice } from './useDevice'

const initial = {
  queue: [] as UploadQueueItem[],
  isLoading: false,
  prevQueueIds: new Set<string>(),
  subscribers: 0,
}

const useUploadProgressStore = create<ZustandType<typeof initial>>((set) => ({ ...initial, set }))

export const useUploadProgress = (onComplete?: () => void, enabled = true) => {
  const { dongleId, routeId } = useRouteParams()
  const { queue, isLoading, set } = useUploadProgressStore()
  const { call } = useDevice()
  const isOwner = useIsDeviceOwner()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const fetchQueueRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!enabled || !dongleId || !isOwner) return

    const store = useUploadProgressStore.getState()
    const isFirst = store.subscribers === 0
    set({ subscribers: store.subscribers + 1 })

    const fetchQueue = async () => {
      set({ isLoading: true })
      try {
        const res = await call('listUploadQueue', undefined)
        if (!res) return

        const routeItems = res.filter((item) => item.path.includes(routeId))
        const currentIds = new Set(routeItems.map((item) => item.id))

        const prev = useUploadProgressStore.getState().prevQueueIds
        if (prev.size > 0) {
          const completedIds = [...prev].filter((id) => !currentIds.has(id))
          if (completedIds.length > 0 && onCompleteRef.current) {
            setTimeout(onCompleteRef.current, 500)
          }
        }

        set({ queue: routeItems, prevQueueIds: currentIds })
      } catch (error) {
        console.error('Failed to fetch upload queue:', error)
      } finally {
        set({ isLoading: false })
      }
    }

    let interval: ReturnType<typeof setInterval> | undefined
    if (isFirst) {
      fetchQueue()
      interval = setInterval(fetchQueue, 10_000)
    }

    fetchQueueRef.current = fetchQueue

    return () => {
      const current = useUploadProgressStore.getState().subscribers
      set({ subscribers: current - 1 })
      if (interval) clearInterval(interval)
    }
  }, [dongleId, routeId, enabled, isOwner, call, set])

  const refetch = () => fetchQueueRef.current?.()

  const isUploading = (segment: number, fileName?: string) =>
    queue.some((item) => {
      const pathMatch = item.path.includes(`--${segment}/`)
      if (!fileName) return pathMatch
      return pathMatch && item.path.includes(fileName)
    })

  const getProgress = (segment: number, fileName?: string) => {
    const item = queue.find((item) => {
      const pathMatch = item.path.includes(`--${segment}/`)
      if (!fileName) return pathMatch
      return pathMatch && item.path.includes(fileName)
    })
    return item?.progress
  }

  const currentUpload = queue.find((item) => item.current)

  return {
    queue,
    isLoading,
    refetch,
    isUploading,
    getProgress,
    currentUpload,
  }
}
