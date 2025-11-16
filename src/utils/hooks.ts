import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

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

export const useDongleId = () => useParams().dongleId!
