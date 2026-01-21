import { useEffect, useRef, useState } from 'react'
import { Html5Video, useDelayRender, useRemotionEnvironment } from 'remotion'
import { Video } from '@remotion/media'
import Hls from 'hls.js'
import { PreviewFiles } from '../../../shared/types'
import { tsFilesToMp4 } from '../utils/ffmpeg'

export const HlsVideo = ({ files }: { files: PreviewFiles }) => {
  const env = useRemotionEnvironment()

  if (env.isRendering) return <RenderingVideo files={files} />
  return <PlaybackVideo files={files} />
}

const RenderingVideo = ({ files }: { files: PreviewFiles }) => {
  const [src, setSrc] = useState<string>()
  const { continueRender, delayRender } = useDelayRender()

  useEffect(() => {
    if (!files.files.length) return

    const handle = delayRender('HLS Video conversion')

    tsFilesToMp4(files.files).then((blob) => {
      setSrc(URL.createObjectURL(blob))
      continueRender(handle)
    })
  }, [files.files])

  if (!src) return null
  return <Video src={src} className="h-full w-full" showInTimeline={false} />
}

const PlaybackVideo = ({ files }: { files: PreviewFiles }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!files.files.length || !videoRef.current) return

    const data = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:61',
      '#EXT-X-MEDIA-SEQUENCE:0',
      '#EXT-X-PLAYLIST-TYPE:VOD',
      ...files.files.flatMap((file) => (!file ? ['#EXT-X-GAP', '#EXTINF:60.0,', 'gap'] : [`#EXTINF:60.0,`, file])),
      '#EXT-X-ENDLIST',
    ].join('\n')

    const blob = new Blob([data], { type: 'application/vnd.apple.mpegurl' })
    const manifestUrl = URL.createObjectURL(blob)

    const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
    hls.loadSource(manifestUrl)
    hls.attachMedia(videoRef.current)

    return () => {
      hls.destroy()
      URL.revokeObjectURL(manifestUrl)
    }
  }, [files.files])

  return <Html5Video ref={videoRef} src="a" className="h-full w-full" showInTimeline={false} />
}
