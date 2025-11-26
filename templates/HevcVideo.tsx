import { CSSProperties, useEffect, useRef } from 'react'
import { OffthreadVideo, Html5Video } from 'remotion'
import { hevcStreamToMp4 } from '../src/utils/ffmpeg'
import { createChunker, extractHevcHeaders, stripMp4Headers } from '../src/utils/hevc'

type VideoProps = { src: string; className?: string; style?: CSSProperties }

const cached: Record<string, ArrayBuffer[]> = {}

export const HevcVideo = ({ src, ...props }: VideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!window.MediaSource) return console.error('No Media Source API available')

    const ms = new MediaSource()
    video.src = window.URL.createObjectURL(ms)

    const onMediaSourceOpen = async () => {
      const sourceBuffer = ms.addSourceBuffer('video/mp4; codecs="hvc1.1.6.L123.b0"')
      sourceBuffer.mode = 'sequence'

      const queue: ArrayBuffer[] = []
      const processQueue = async () => {
        if (sourceBuffer.updating || queue.length === 0) return
        const buffer = queue.shift()
        if (!buffer) throw new Error(`Queue length larger than 0, but buffer undefined`)

        cached[src].push(buffer)
        sourceBuffer.appendBuffer(buffer as ArrayBuffer)
      }
      sourceBuffer.addEventListener('updateend', () => processQueue())

      if (cached[src]?.length) {
        for (const buffer of cached[src]) {
          queue.push(buffer)
          processQueue()
        }
        return
      }
      cached[src] = []

      const res = await fetch(src)
      if (!res.ok || !res.body) return

      const stream = res.body
      const chunker = createChunker(stream, 7 * 1024 * 1024)

      let count = 0
      let headers: Uint8Array | null = null

      for await (const chunk of chunker) {
        let chunkToConvert = chunk
        if (!headers) headers = extractHevcHeaders(chunk)
        else if (headers) {
          const newChunk = new Uint8Array(headers.length + chunk.length)
          newChunk.set(headers)
          newChunk.set(chunk, headers.length)
          chunkToConvert = newChunk
        }

        let mp4Segment = await hevcStreamToMp4(chunkToConvert)
        if (count > 0) mp4Segment = stripMp4Headers(mp4Segment)

        count++
        queue.push(mp4Segment.buffer)
        processQueue()
      }
    }

    ms.addEventListener('sourceopen', onMediaSourceOpen)
  }, [])

  if (src.endsWith('.mp4')) return <OffthreadVideo src={src} {...props} />
  return <Html5Video src={src} ref={videoRef} {...props} />
}
