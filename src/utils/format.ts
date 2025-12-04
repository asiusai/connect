import { DateTime } from 'luxon'
import type { Route } from '../types'
import { storage } from './helpers'

export const MI_TO_KM = 1.609344

export const isImperial = (): boolean => {
  const saved = storage.get('imperial')
  if (saved !== null) return saved === 'true'

  // Getting default value
  if (typeof navigator === 'undefined') return false
  const locale = navigator?.language.toLowerCase()
  const value = locale.startsWith('en-us') || locale.startsWith('en-gb')
  storage.set('imperial', String(value))
  return value
}

export const formatDistance = (miles: number | undefined): string | undefined => {
  if (miles === undefined) return
  if (isImperial()) return `${miles.toFixed(1)} mi`
  return `${(miles * MI_TO_KM).toFixed(1)} km`
}

export const formatDurationMs = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} hr ${minutes} min`
  return `${minutes} min`
}

export const formatDuration = (minutes: number | undefined): string | undefined => {
  if (minutes === undefined) return
  return formatDurationMs(minutes * 60000)
}

export const getRouteDurationMs = (route: Route | undefined): number | undefined => {
  if (!route || !route.start_time || !route.end_time) return
  const startTime = new Date(route.start_time).getTime()
  const endTime = new Date(route.end_time).getTime()
  return endTime - startTime
}

export const formatRouteDuration = (route: Route | undefined): string | undefined => {
  if (!route) return
  const duration = getRouteDurationMs(route)
  return duration !== undefined ? formatDurationMs(duration) : undefined
}

export const use12hTime = () => storage.get('12hTime') === 'true'

type DateTimeInput = string | number | DateTime | null | undefined
export const getDateTime = (input: DateTimeInput) => {
  if (!input) return
  if (typeof input === 'string') return DateTime.fromISO(input, { zone: 'utc' }).toLocal()
  if (typeof input === 'number') return DateTime.fromSeconds(input, { zone: 'utc' }).toLocal()
  return input
}

export const formatTime = (time: DateTimeInput) =>
  use12hTime() ? getDateTime(time)?.toFormat('h:mm a') : getDateTime(time)?.toFormat('HH:mm')

export const formatDate = (input: DateTimeInput) => {
  const date = getDateTime(input)
  if (!date) return
  const now = DateTime.now()

  if (date.hasSame(now, 'day')) return `Today – ${date.toFormat('cccc, MMM d')}`
  else if (date.hasSame(now.minus({ days: 1 }), 'day')) return `Yesterday – ${date.toFormat('cccc, MMM d')}`
  else if (date.hasSame(now, 'year')) return date.toFormat('cccc, MMM d')
  else return date.toFormat('cccc, MMM d, yyyy')
}

export const getRouteColor = (
  startTime: DateTime | undefined,
  endTime: DateTime | undefined,
  startColor: number[],
  endColor: number[],
): string => {
  if (!startTime || !endTime) return 'red'
  // FIXME: adjust based on season
  const sunrise = 5.5 // hours
  const sunset = 6.5 + 12
  const fade = 1.5 // wide transition since this accounts for different seasons

  const startHours = startTime.hour + startTime.minute / 60
  const endHours = endTime.hour + endTime.minute / 60
  const hours = (startHours + endHours) / 2

  let blendFactor =
    sunrise < hours && hours < sunset
      ? Math.min((hours - sunrise) / fade, 1)
      : sunset <= hours
        ? Math.max(1 - (hours - sunset) / fade, 0)
        : 0

  return `rgb(${startColor.map((c, i) => Math.round(c + (endColor[i] - c) * blendFactor)).join(', ')})`
}

export const formatCurrency = (amount: number) => `$${(amount / 100).toFixed(amount % 100 === 0 ? 0 : 2)}`

export const formatVideoTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, '0')
  return `${min}:${sec}`
}

export const timeAgo = (time: number): string => {
  const diff = Math.floor(Date.now() / 1000) - time

  if (diff < 120) return 'active now'

  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `active ${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `active ${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 365) return `active ${days}d ago`

  const years = Math.floor(days / 365)
  return `active ${years}y ago`
}
