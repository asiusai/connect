// biome-ignore lint/correctness/noUnusedImports: needed
import React from 'react'
import { AbsoluteFill, CalculateMetadataFunction, Img, staticFile } from 'remotion'
import { z } from 'zod'
import { getCoords, getRouteStats, getTimelineEvents } from '../utils/derived'
import { api } from '../api'
import { getPathStaticMapUrl } from '../utils/map'
import { formatDistance, formatDuration, getRouteDurationMs } from '../utils/format'
import { Route } from '../../../shared/types'
import { DateTime } from 'luxon'
import clsx from 'clsx'
import { Logo } from '../components/Logo'
import { env } from '../../../shared/env'

export const OGProps = z.object({
  routeName: z.string(),
  data: z
    .object({
      route: Route,
      staticMap: z.string().optional(),
      routeDurationMs: z.number(),
      engagedDurationMs: z.number(),
    })
    .optional(),
})

export type OGProps = z.infer<typeof OGProps>

export const getOGData = async (props: OGProps) => {
  const [dongleId] = props.routeName.split('/')

  const segments = await api.routes.routesSegments.query({ params: { dongleId }, query: { route_str: props.routeName } })
  if (segments.status !== 200) throw new Error()
  const route = segments.body[0]

  let coords = await getCoords(route).then((x) => x.map(({ lng, lat }) => [lng, lat] as [number, number]))
  if (!coords.length && route.start_lng && route.start_lat && route.end_lng && route.end_lat)
    coords = [
      [route.start_lng, route.start_lat],
      [route.end_lng, route.end_lat],
    ]
  const stats = await getTimelineEvents(route).then(getRouteStats)

  return {
    staticMap: getPathStaticMapUrl('dark', coords, 439, 174, true),
    routeDurationMs: getRouteDurationMs(route) ?? 0,
    engagedDurationMs: stats.engagedDurationMs,
    route,
  }
}

export const ogCalculateMetadata: CalculateMetadataFunction<OGProps> = async ({ props }) => {
  if (!props.data) props.data = await getOGData(props)
  return { props }
}

const Icons = {
  route: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M4 10c0-2 1.5-3.5 3.5-3.5 1.5 0 2.5 1 2.5 2.5 0 1.5-1 2.5-2.5 2.5H4" className="opacity-50" strokeDasharray="4 4" />
    </svg>
  ),
  schedule: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  ),
  device: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
}

const CircularProgress = ({ percentage }: { percentage: number }) => {
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 24 24">
        <circle className="text-white/20" strokeWidth="3" stroke="currentColor" fill="transparent" r={radius} cx="12" cy="12" />
        <circle
          className="text-[#55E99D]"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="12"
          cy="12"
        />
      </svg>
    </div>
  )
}

export const OG = ({ data }: OGProps) => {
  if (!data) return null

  const engagedPercent = data.routeDurationMs ? Math.round((data.engagedDurationMs / data.routeDurationMs) * 100) : 0
  const duration = formatDuration(data.routeDurationMs / (60 * 1000))
    ?.replace(' hr', 'h')
    ?.replace(' min', 'm')
  return (
    <AbsoluteFill className="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a1a1a] to-[#050505] text-white font-sans p-12 flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <h1 className="text-7xl font-bold tracking-tight leading-tight">Drive in Tartu</h1>
          <div className="text-4xl text-white/50 font-medium">
            {data.route.start_time ? DateTime.fromISO(data.route.start_time).toFormat('MMM d, yyyy') : '—'}
          </div>
        </div>
        <div className="flex items-center gap-4 opacity-80">
          <Logo className="" />
          <Img src={staticFile(env.FAVICON)} className="h-10 w-auto" />
          <span className="text-3xl font-bold tracking-tight">
            comma <span className="opacity-70">connect</span>
          </span>
        </div>
      </div>

      {/* Middle */}
      <div className="flex flex-row h-[55%] w-full gap-16 items-center">
        <div className="h-full flex-grow relative rounded-[2.5rem] overflow-hidden border-[1px] border-white/10 shadow-2xl bg-[#1a1a1a]">
          {data.staticMap && <Img src={data.staticMap} className="w-full h-full object-cover opacity-80" />}
        </div>

        <div className="flex flex-col justify-center gap-12 min-w-[300px]">
          {[
            { label: 'Distance', icon: Icons.route, value: data.route.distance ? formatDistance(data.route.distance) : undefined },
            { label: 'Duration', icon: Icons.schedule, value: duration },
            {
              label: 'Engaged',
              icon: <CircularProgress percentage={engagedPercent} />,
              value: `${engagedPercent}%`,
              highlight: true,
              hidden: !engagedPercent,
            },
          ].map(({ icon, label, value, highlight, hidden }) => (
            <div key={label} className={clsx('flex flex-col gap-1', hidden && 'hidden')}>
              <div className="flex items-center gap-4 text-white/60 mb-1">
                <div className="w-8 h-8 flex items-center justify-center opacity-80">{icon}</div>
                <span className="text-3xl font-medium">{label}</span>
              </div>
              <div className={`text-5xl font-bold tracking-tight ${highlight ? 'text-[#55E99D]' : 'text-white'}`}>{value || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-white/40 text-2xl font-medium">
        <div className="flex items-center gap-4">
          <span>comma.asius.ai</span>
          <span className="w-px h-5 bg-white/20" />
          <span>make driving chill</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
