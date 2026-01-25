import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { AppRoute, AppRouter, ClientInferRequest, ClientInferResponses } from '@ts-rest/core'
import { contract } from '../../../shared/contract'
import { createClient } from '../../../shared/api'
import { accessToken } from '../utils/helpers'

// Types
type Req<T extends AppRoute> = ClientInferRequest<T>
type Res<T extends AppRoute> = ClientInferResponses<T, 200>['body']

type QueryOptions<T extends AppRoute> = Req<T> & {
  enabled?: boolean
  refetchInterval?: number
  onSuccess?: (data: Res<T>) => void
  onError?: (error: string) => void
}

type MutationOptions<T extends AppRoute> = {
  onSuccess?: (data: Res<T>) => void
  onError?: (error: string) => void
}

type QueryOutput<T extends AppRoute> = [
  Res<T> | undefined,
  {
    refetch: () => Promise<void>
    loading: boolean
    refetching: boolean
    error?: string
  },
]

type MutationOutput<T extends AppRoute> = {
  mutate: (args: Req<T>) => Promise<Res<T> | undefined>
  data?: Res<T>
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error?: string
}

// Cache
type CacheEntry = { data: unknown; error?: string; loading: boolean; timestamp: number }
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const defaultEntry: CacheEntry = { data: undefined, error: undefined, loading: false, timestamp: 0 }
const getCache = (key: string): CacheEntry => cache.get(key) ?? defaultEntry
const setCache = (key: string, entry: Partial<CacheEntry>) => {
  cache.set(key, { ...getCache(key), ...entry })
  notify()
}

export const invalidate = (...keyParts: string[]) => {
  for (const k of cache.keys()) {
    if (keyParts.length === 0 || keyParts.every((part) => k.includes(part))) cache.delete(k)
  }
  notify()
}

// Hook implementations
const createUseQuery = <T extends AppRoute>(routePath: string, fetcher: (args: Req<T>) => Promise<{ status: number; body: Res<T> }>) => {
  return (options: QueryOptions<T>): QueryOutput<T> => {
    const { enabled = true, refetchInterval, onSuccess, onError, ...args } = options
    const key = routePath + ':' + JSON.stringify(args)

    const entry = useSyncExternalStore(
      (cb) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
      () => getCache(key),
    )

    const fetchData = useCallback(async () => {
      if (!enabled) return
      if (inflight.has(key)) return inflight.get(key)
      setCache(key, { loading: true, error: undefined })
      const promise = (async () => {
        try {
          const res = await fetcher(args as Req<T>)
          if (res.status >= 400) throw new Error(typeof res.body === 'string' ? res.body : `Request failed: ${res.status}`)
          setCache(key, { data: res.body, loading: false, timestamp: Date.now() })
          onSuccess?.(res.body)
        } catch (e) {
          const error = e instanceof Error ? e.message : 'Unknown error'
          setCache(key, { error, loading: false })
          onError?.(error)
        } finally {
          inflight.delete(key)
        }
      })()
      inflight.set(key, promise)
      return promise
    }, [key, enabled])

    useEffect(() => {
      if (!enabled) return
      if (!entry.data && !entry.loading && !entry.error) fetchData()
    }, [key, enabled, fetchData, entry])

    useEffect(() => {
      if (!refetchInterval || !enabled) return
      const id = setInterval(fetchData, refetchInterval)
      return () => clearInterval(id)
    }, [key, refetchInterval, enabled])

    return [
      entry.data as Res<T> | undefined,
      {
        refetch: fetchData,
        loading: entry.loading && !entry.data,
        refetching: entry.loading && !!entry.data,
        error: entry.error,
      },
    ]
  }
}

const createUseMutation = <T extends AppRoute>(mutator: (args: Req<T>) => Promise<{ status: number; body: Res<T> }>) => {
  return (options?: MutationOptions<T>): MutationOutput<T> => {
    const [state, setState] = useState<{ data?: Res<T>; error?: string; loading: boolean }>({
      data: undefined,
      error: undefined,
      loading: false,
    })

    const mutate = useCallback(
      async (args: Req<T>) => {
        setState({ data: undefined, error: undefined, loading: true })
        try {
          const res = await mutator(args)
          if (res.status >= 400) throw new Error(typeof res.body === 'string' ? res.body : `Request failed: ${res.status}`)
          setState({ data: res.body, error: undefined, loading: false })
          options?.onSuccess?.(res.body)
          return res.body
        } catch (e) {
          const error = e instanceof Error ? e.message : 'Unknown error'
          setState({ data: undefined, error, loading: false })
          options?.onError?.(error)
          return undefined
        }
      },
      [options?.onSuccess, options?.onError],
    )

    return {
      mutate,
      data: state.data,
      isPending: state.loading,
      isError: !!state.error,
      isSuccess: !!state.data && !state.error,
      error: state.error,
    }
  }
}

// Wrap a route with hooks
type WrappedRoute<T extends AppRoute> = {
  useQuery: (options: QueryOptions<T>) => QueryOutput<T>
  useMutation: (options?: MutationOptions<T>) => MutationOutput<T>
  query: (args: Req<T>) => Promise<{ status: number; body: Res<T> }>
  mutate: (args: Req<T>) => Promise<{ status: number; body: Res<T> }>
}

const wrapRoute = <T extends AppRoute>(route: T, fetcher: (args: Req<T>) => Promise<{ status: number; body: Res<T> }>): WrappedRoute<T> => ({
  useQuery: createUseQuery(route.path, fetcher),
  useMutation: createUseMutation(fetcher),
  query: fetcher,
  mutate: fetcher,
})

// Recursively wrap all routes in a router
type WrappedRouter<T> = T extends AppRoute ? WrappedRoute<T> : T extends AppRouter ? { [K in keyof T]: WrappedRouter<T[K]> } : never

const wrapRouter = <T extends AppRouter>(router: T, client: any): WrappedRouter<T> => {
  const result: any = {}
  for (const key of Object.keys(router)) {
    const route = router[key]
    if ('method' in route && 'path' in route) {
      result[key] = wrapRoute(route as AppRoute, client[key])
    } else {
      result[key] = wrapRouter(route as AppRouter, client[key])
    }
  }
  return result
}

export const api = wrapRouter(contract, createClient(accessToken))
