import { useEffect, useRef } from 'react'
import { Html5Video, RemotionVideoProps } from 'remotion'
import Hls from 'hls.js'

export const HlsVideo = ({ src, ...props }: RemotionVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!src) throw new Error('src is required')

    const startFrom = 0

    const hls = new Hls({
      startLevel: 4,
      maxBufferLength: 5,
      maxMaxBufferLength: 5,
    })

    hls.on(Hls.Events.MANIFEST_PARSED, () => void hls.startLoad(startFrom))

    hls.loadSource(src)
    hls.attachMedia(videoRef.current!)

    return () => void hls.destroy()
  }, [src])

  return <Html5Video {...props} ref={videoRef} src={src} className="h-full w-full" />
}
