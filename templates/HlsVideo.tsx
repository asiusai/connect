import { useEffect, useRef } from 'react'
import { Html5Video } from 'remotion'
import Hls from 'hls.js'
import { PreviewFiles } from '../src/types'

export const HlsVideo = ({ files }: { files: PreviewFiles }) => {
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
