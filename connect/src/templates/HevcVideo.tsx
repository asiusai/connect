import { CSSProperties, useEffect, useState } from 'react'
import { Video } from '@remotion/media'
import { hevcToMp4 } from '../utils/ffmpeg'
import { createChunker } from '../utils/hevc'
import { useDelayRender } from 'remotion'
import { cn } from '../../../shared/helpers'
import { useAuth } from '../hooks/useAuth'

type VideoProps = { src: string; className?: string; style?: CSSProperties }

export const HevcVideo = (props: VideoProps) => {
  const { provider } = useAuth()
  if (provider === 'asius') return <Video {...props} showInTimeline={false} className={cn('relative', props.className)} />
  else return <RawHevcVideo {...props} />
}

type Cache = { data?: string; done?: boolean }
const cache = new Map<string, Cache>()

const triggerVideo = async (src: string) => {
  let entry = cache.get(src)
  if (entry) return

  entry = {}
  cache.set(src, entry)

  const res = await fetch(src)
  if (!res.ok || !res.body) return

  let data = new Uint8Array()
  for await (const chunk of createChunker(res.body, 6 * 1024 * 1024)) {
    const newData = new Uint8Array(data.length + chunk.length)
    newData.set(data, 0)
    newData.set(chunk, data.length)
    data = newData
    hevcToMp4(data).then((x) => {
      if (entry.data) URL.revokeObjectURL(entry.data)
      entry.data = URL.createObjectURL(x)
    })
  }
  entry.done = true
}

export const RawHevcVideo = (props: VideoProps) => {
  const [src, setSrc] = useState<string>()
  const { continueRender, delayRender } = useDelayRender()

  useEffect(() => {
    const handle = delayRender(`Video ${props.src}`)
    triggerVideo(props.src)

    const getData = () => {
      const entry = cache.get(props.src)
      if (!entry?.data) return

      setSrc(entry.data)
      if (entry.done) continueRender(handle)
    }

    getData()
    const interval = setInterval(getData, 200)
    return () => clearInterval(interval)
  }, [props.src, continueRender, delayRender])

  if (!src) return null
  return <Video {...props} src={src} showInTimeline={false} className="relative" />
}
