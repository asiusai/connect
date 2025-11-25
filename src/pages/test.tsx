import { useState } from 'react'
import { hevcToMp4 } from '../utils/ffmpeg'
import { useAsyncEffect } from '../utils/hooks'

const HEVC_URL = '/fcamera.hevc'

export const Current = () => {
  const [url, setUrl] = useState<string>()
  useAsyncEffect(async () => {
    const bin = await fetch(HEVC_URL).then((x) => x.arrayBuffer())
    const blob = await hevcToMp4(new Uint8Array(bin), console.log)
    setUrl(URL.createObjectURL(blob))
  }, [])

  if (!url) return null
  return <video src={url} controls autoPlay />
}

export const Streaming = () => {
  // TODO
  return null
}

export const Component = () => {
  return (
    <div>
      <Current />
      <Streaming />
    </div>
  )
}
