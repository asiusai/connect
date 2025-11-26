import { AbsoluteFill, CalculateMetadataFunction, Series } from 'remotion'
import { z } from 'zod'
import { FPS, getRouteDuration, getRouteSegment } from './shared'
import { createQCameraStreamUrl } from '../src/utils/helpers'
import { DrivingPath } from './DrivingPath'
import { Files } from '../src/types'
import { api } from '../src/api'
import { HevcVideo } from './HevcVideo'
import { HlsVideo } from './HlsVideo'

export const PreviewProps = z.object({
  routeName: z.string(),
  qCamUrl: z.string().optional(),
  files: Files.optional(),
})
export type PreviewProps = z.infer<typeof PreviewProps>

export const previewCalculateMetadata: CalculateMetadataFunction<PreviewProps> = async ({ props: { routeName, qCamUrl } }) => {
  if (!routeName) return {}

  const segment = await getRouteSegment(routeName)
  const duration = getRouteDuration(segment)
  if (!qCamUrl) qCamUrl = createQCameraStreamUrl(routeName, { exp: segment.share_exp, sig: segment.share_sig })

  const files = await api.file.files.query({ params: { routeName } })
  if (files.status !== 200) throw new Error()
  return {
    durationInFrames: duration * FPS,
    props: { routeName, qCamUrl, files: files.body },
  }
}

export const Preview = ({ qCamUrl, files, routeName }: PreviewProps) => {
  if (!files) return null
  return (
    <AbsoluteFill style={{}}>
      {files.cameras.length ? (
        <Series>
          {files?.cameras.map((src) => (
            <Series.Sequence key={src} durationInFrames={60 * FPS} premountFor={60 * FPS}>
              <HevcVideo src={src} />
            </Series.Sequence>
          ))}
        </Series>
      ) : (
        <HlsVideo src={qCamUrl} />
      )}
      {files && <DrivingPath files={files} routeName={routeName} />}
    </AbsoluteFill>
  )
}
