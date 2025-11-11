import { useState, useEffect, useCallback } from 'react'

export type Accessor<T> = () => T
export type Setter<T> = React.Dispatch<React.SetStateAction<T>>
export type Resource<T> = any | T

export const useCreateSignal = <T = undefined>(initial?: T): [Accessor<T>, Setter<T | undefined>] => {
  const [state, setState] = useState<T | undefined>(initial)
  return [() => state as T, setState]
}

export const createResource = <Args, T>(args: Args, fetcher: (args: Args) => Promise<T>) => {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher(args)
      setData(result)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [args, fetcher])

  useEffect(() => {
    fetch()
  }, [fetch])

  return [
    {
      refetch: fetch,
      mutate: setData,
      loading,
      error,
      data,
    },
  ] as const
}
