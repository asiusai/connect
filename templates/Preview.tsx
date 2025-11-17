import { AbsoluteFill, CalculateMetadataFunction } from 'remotion'
import { HlsVideo } from './HlsVideo'
import { z } from 'zod'
import { FPS, getRouteDuration, getRouteSegment } from './shared'
import { createQCameraStreamUrl } from '../src/utils/helpers'

export const PreviewProps = z.object({
  routeName: z.string(),
  qCamUrl: z.string().optional(),
})
export type PreviewProps = z.infer<typeof PreviewProps>

export const previewCalculateMetadata: CalculateMetadataFunction<PreviewProps> = async ({ props: { routeName, qCamUrl } }) => {
  if (!routeName) return {}

  const segment = await getRouteSegment(routeName)
  const duration = getRouteDuration(segment)
  if (!qCamUrl) qCamUrl = createQCameraStreamUrl(routeName, { exp: segment.share_exp, sig: segment.share_sig })
  return {
    durationInFrames: duration * FPS,
    props: { routeName, qCamUrl },
  }
}

export const Preview = ({ qCamUrl }: PreviewProps) => {
  return <AbsoluteFill style={{}}>{qCamUrl && <HlsVideo src={qCamUrl} />}</AbsoluteFill>
}
