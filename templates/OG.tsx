import { AbsoluteFill, CalculateMetadataFunction, Img, staticFile } from 'remotion'
import { z } from 'zod'
import { getCoords, getRouteStats } from '../src/utils/derived'
import { api } from '../src/api'
import { getPathStaticMapUrl } from '../src/utils/map'
import { formatDistance, formatDuration } from '../src/utils/format'
import { Route } from '../src/types'

export const OGProps = z.object({
  routeName: z.string(),
  data: z
    .object({
      route: Route,
      staticMap: z.string(),
      routeDurationMs: z.number(),
      engagedDurationMs: z.number(),
    })
    .optional(),
})

export type OGProps = z.infer<typeof OGProps>

export const getOGData = async (props: OGProps) => {
  const [dongleId] = props.routeName.split('/')

  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: props.routeName } })
  if (segments.status !== 200) throw new Error()
  const route = segments.body[0]

  const coords = await getCoords(route).then((x) => x.map(({ lng, lat }) => [lng, lat] as [number, number]))
  if (!coords.length) return
  const stats = await getRouteStats(route)
  return {
    staticMap: getPathStaticMapUrl('dark', coords, 512, 512, true),
    routeDurationMs: stats.routeDurationMs,
    engagedDurationMs: stats.engagedDurationMs,
    route,
  }
}

export const ogCalculateMetadata: CalculateMetadataFunction<OGProps> = async ({ props }) => {
  return { props: { ...props, data: await getOGData(props) } }
}

export const OG = ({ data }: OGProps) => {
  console.log(data)
  if (!data) return
  return (
    <AbsoluteFill className="bg-background text-4xl text-background-x">
      <div>
        <Img src={staticFile('/images/comma-white.svg')} />
        <span>comma</span>
        <span className="opacity-70">connect</span>
      </div>
      <div>Drive in Tartu</div>

      {[
        { label: 'Distance', value: formatDistance(data.route.distance) },
        { label: 'Duration', value: formatDuration(data.routeDurationMs / (60 * 1000)) },
        {
          label: 'Engaged',
          value: data?.routeDurationMs ? `${(100 * (data.engagedDurationMs / data.routeDurationMs)).toFixed(0)}%` : undefined,
        },
      ].map(({ label, value }) => (
        <div key={label}>
          {label}:{value}
        </div>
      ))}

      <div>
        <div>comma.ai</div>
        <div>make driving chill</div>
      </div>
      <Img src={data.staticMap} />
    </AbsoluteFill>
  )
}
