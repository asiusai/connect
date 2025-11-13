import { AbsoluteFill, CalculateMetadataFunction } from 'remotion'
import { z } from 'zod'
import { api } from '../api'
import { HlsVideo } from './HlsVideo'
import { Files, RouteSegment } from '../api/types'
import { createQCameraStreamUrl } from '../api/route'

const FPS = 30

const Data = z.object({
  segments: RouteSegment.array().optional(),
  qCamUrl: z.string().optional(),
  files: Files,
})

export const MainProps = z.object({
  routeName: z.string(),
  data: Data.optional(),
})
export type MainProps = z.infer<typeof MainProps>

export const calculateMetadata: CalculateMetadataFunction<MainProps> = async ({ props: { routeName } }) => {
  const [dongleId] = routeName.split('/')

  const segments = await api.routes.segments.query({ params: { dongleId }, query: { route_str: routeName } })
  if (segments.status !== 200) throw new Error('Failed getting segments!')
  const segment = segments.body[0]

  const durationInSeconds = (segment.end_time_utc_millis - segment.start_time_utc_millis) / 1000
  const qCamUrl = createQCameraStreamUrl(routeName.replace('/', '%7C'), { exp: segment.share_exp, sig: segment.share_sig })
  const files = await api.file.files.query({ params: { routeName: routeName.replace('/', '%7C') } })
  if (files.status !== 200) throw new Error('Failed getting files!')

  const data = {
    segments: segments.body,
    files: files.body,
    qCamUrl,
  }
  return {
    durationInFrames: durationInSeconds * FPS,
    props: { routeName, data },
  }
}

export const Main = (props: MainProps) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', fontSize: 50 }}>
      {props.data && <HlsVideo src={props.data.qCamUrl} style={{ width: '100%' }} />}
    </AbsoluteFill>
  )
}
