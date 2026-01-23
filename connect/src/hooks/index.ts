import { useCallback, useEffect, useState } from 'react'
import { useParams as useParamsRouter } from 'react-router-dom'

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
  const { dongleId, routeId, start, end } = useParamsRouter()
  return {
    dongleId: dongleId!,
    routeId: routeId!,
    routeName: `${dongleId}/${routeId}`,
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

export const usePosition = () => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)

  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(setPosition, (err) => {
      console.log("Error getting user's position", err)
      setPosition(null)
    })
  }, [])

  useEffect(() => {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        permission.addEventListener('change', requestPosition)

        if (permission.state === 'granted') requestPosition()
      })
      .catch(() => setPosition(null))
  }, [requestPosition])
  return { position, requestPosition }
}
