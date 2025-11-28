import { useEffect, useRef } from 'react'
import { Html5Video, RemotionVideoProps } from 'remotion'
import Hls from 'hls.js'

export const HlsVideo = ({ src, ...props }: RemotionVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!src || !videoRef.current) return

    const virtualManifest = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:61', '#EXTINF:60,', src, '#EXT-X-ENDLIST'].join('\n')

    const blob = new Blob([virtualManifest], { type: 'application/vnd.apple.mpegurl' })
    const manifestUrl = URL.createObjectURL(blob)

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    })

    hls.loadSource(manifestUrl)
    hls.attachMedia(videoRef.current)

    return () => {
      hls.destroy()
      URL.revokeObjectURL(manifestUrl)
    }
  }, [src])

  return <Html5Video {...props} src={src} ref={videoRef} className="h-full w-full" showInTimeline={false} />
}
