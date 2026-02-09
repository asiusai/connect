import { useState, useEffect } from 'react'
import { Route } from '../../../shared/types'
import { getStartEndPlaceName } from '../utils/map'

export const getLocationText = ({ start, end }: { start?: string; end?: string }) => {
  if (!start && !end) return 'Drive Details'
  if (!end || start === end) return `Drive in ${start}`
  if (!start) return `Drive in ${end}`
  return `${start} to ${end}`
}
export const useRouteLocation = (route: Route | undefined) => {
  const [location, setLocation] = useState<{ start?: string; end?: string }>()
  useEffect(() => {
    if (route) getStartEndPlaceName(route).then(setLocation)
  }, [route])
  return location ? getLocationText(location) : 'Drive details'
}
