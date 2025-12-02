import { useEffect, useState } from 'react'
import { useParams as useParamsRouter } from 'react-router-dom'

type Dimensions = { width: number; height: number }
const getDimensions = (): Dimensions =>
  typeof window === 'undefined' ? { width: 0, height: 0 } : { width: window.innerWidth, height: window.innerHeight }
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
  const { dongleId, date } = useParamsRouter()
  return { dongleId: dongleId!, date: date!, routeName: `${dongleId}|${date}` }
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
