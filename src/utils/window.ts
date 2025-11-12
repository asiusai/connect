import { useEffect, useState } from 'react'

type Dimensions = { width: number; height: number }

export const getDimensions = (): Dimensions => {
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  const { innerWidth: width, innerHeight: height } = window
  return { width, height }
}

export const useDimensions = ():Dimensions => {
  const [dimensions, setDimensions] = useState(getDimensions())

  const onResize = () => setDimensions(getDimensions())
  useEffect(() => {
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return dimensions
}
