import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Route } from '../types'
import { dateTimeToColorBetween, formatDistance, formatDuration } from '../utils/format'
import { getPlaceName } from '../utils/map'
import { Icon } from './material/Icon'

dayjs.extend(utc)
dayjs.extend(timezone)

const getLocation = async (route: Route) => {
  const startPos = [route.start_lng || 0, route.start_lat || 0]
  const endPos = [route.end_lng || 0, route.end_lat || 0]
  const startPlace = await getPlaceName(startPos)
  const endPlace = await getPlaceName(endPos)
  if (!startPlace && !endPlace) return ''
  if (!endPlace || startPlace === endPlace) return startPlace
  if (!startPlace) return endPlace
  return `${startPlace} to ${endPlace}`
}

export const RouteCard = ({ route }: { route: Route }) => {
  const startTime = dayjs.utc(route.start_time).local()
  const endTime = dayjs.utc(route.end_time).local()
  const color = dateTimeToColorBetween(startTime.toDate(), endTime.toDate(), [30, 57, 138], [218, 161, 28])

  const [location, setLocation] = useState<string | null>(null)
  useEffect(() => void getLocation(route).then(setLocation), [route])

  const duration = endTime.diff(startTime)
  const durationStr = formatDuration(duration / (60 * 1000))
  const distanceStr = formatDistance(route.distance)

  return (
    <Link
      to={`/${route.dongle_id}/routes/${route.fullname.slice(17)}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-xl bg-background-alt p-4 shadow-sm transition-all hover:bg-background-alt/80 active:scale-[0.99]"
    >
      {/* Color Indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />

      <div className="flex flex-col gap-1 pl-3">
        {/* Time and Duration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <span>{startTime.format('h:mm A')}</span>
            <span className="text-white/40 text-sm font-normal">•</span>
            <span>{endTime.format('h:mm A')}</span>
          </div>
          <div className="text-xs font-medium text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{durationStr}</div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 min-h-[24px]">
          <Icon name="location_on" className="mt-0.5 text-[16px] text-white/40 shrink-0" />
          <span className="text-sm font-medium text-white/80 leading-snug line-clamp-2">{location || 'Loading location...'}</span>
        </div>

        {/* Footer / Stats */}
        <div className="mt-2 flex items-center gap-4 border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5">
            <Icon name="directions_car" className="text-[16px] text-white/40" />
            <span className="text-xs font-medium text-white/70">{distanceStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name={route.is_public ? 'public' : 'public_off'} className="text-[16px] text-white/40" />
            <span className="text-xs font-medium text-white/70">{route.is_public ? 'Public' : 'Private'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
