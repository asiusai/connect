import { CSSProperties, useEffect, useState } from 'react'
import { delayRender, continueRender, OffthreadVideo } from 'remotion'
import { DB } from '../src/utils/db'
import { DownloadProgress, hevcToMp4, OnDownloadProgress } from '../src/utils/ffmpeg'

const files: Record<string, Promise<Blob>> = {}

const getBlob = async (file: string, onLoad: OnDownloadProgress) => {
  const key = new URL(file).origin + new URL(file).pathname

  const loadFile = async () => {
    const db = await new DB().init()
    let res = await db.get<Blob>(key)
    if (res) return res

    res = await hevcToMp4(file, onLoad)
    await db.set(key, res)
    return res
  }

  if (!files[key]) files[key] = loadFile()
  return await files[key]
}

type VideoProps = { src: string; className?: string; style?: CSSProperties; name: string }

export const HevcFfmpegVideo = ({ src, name, ...props }: VideoProps) => {
  const [handle] = useState(() => delayRender('hevc', { timeoutInMilliseconds: 120_000 }))
  const [url, setUrl] = useState<string>()
  const [load, setLoad] = useState<DownloadProgress>()

  useEffect(() => {
    if (url) return
    getBlob(src, setLoad).then((blob) => {
      setUrl(URL.createObjectURL(blob))
      continueRender(handle)
    })
  }, [src])

  const percent = load ? load.loaded / load.length : 0
  if (!url)
    return (
      <div {...props}>
        Loading {name} {(percent * 100).toFixed()}%
      </div>
    )
  return <OffthreadVideo showInTimeline={false} {...props} src={url} />
}

export const HevcVideo = ({ ...props }: VideoProps) => {
  if (props.src.endsWith('.mp4')) return <OffthreadVideo {...props} />
  return <HevcVideo {...props} />
}
