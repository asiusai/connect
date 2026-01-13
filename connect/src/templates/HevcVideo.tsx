import { CSSProperties, useEffect, useState } from 'react'
import { Video } from '@remotion/media'
import { hevcToMp4 } from '../utils/ffmpeg'
import { createChunker } from '../utils/hevc'
import { useDelayRender } from 'remotion'
import { env } from '../utils/env'

type VideoProps = { src: string; className?: string; style?: CSSProperties }

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

export const HevcVideo = ({ src, ...props }: VideoProps) => {
  const [data, setData] = useState<string>()
  const { continueRender, delayRender } = useDelayRender()

  useEffect(() => {
    // For our API, HEVC files are already remuxed to MP4 on upload
    if (env.IS_OURS) {
      setData(src)
      return
    }

    const handle = delayRender(`Video ${src}`)
    triggerVideo(src)

    const getData = () => {
      const entry = cache.get(src)
      if (!entry?.data) return

      setData(entry.data)
      if (entry.done) continueRender(handle)
    }

    getData()
    const interval = setInterval(getData, 200)
    return () => clearInterval(interval)
  }, [src])

  if (!data) return null
  return <Video src={data} {...props} showInTimeline={false} className="relative" />
}
