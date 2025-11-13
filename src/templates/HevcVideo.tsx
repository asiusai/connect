import { CSSProperties, useEffect, useState } from 'react'
import { Html5Video, delayRender, continueRender } from 'remotion'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { DB } from './indexedDb'

const ffmpeg = new FFmpeg()
ffmpeg.on('log', ({ message }) => console.log(message))

const init = async () => {
  await ffmpeg.load({
    coreURL: await toBlobURL(`https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm`, 'application/wasm'),
  })
}
const loaded = init()

const files: Record<string, Promise<Blob>> = {}

const convert = async (file: string) => {
  await loaded
  await ffmpeg.writeFile('input.hevc', await fetchFile(file))
  await ffmpeg.exec(['-r', '20', '-i', 'input.hevc', '-c', 'copy', '-map', '0', '-vtag', 'hvc1', 'output.mp4'])
  const data = await ffmpeg.readFile('output.mp4')
  return new Blob([(data as any).buffer], { type: 'video/mp4' })
}

const loadFile = async (key: string, file: string) => {
  const db = await new DB().init()
  let res = await db.get<Blob>(key)
  if (res) return res

  res = await convert(file)
  await db.set(key, res)
  return res
}

const getBlob = async (file: string) => {
  const key = new URL(file).origin + new URL(file).pathname
  if (!files[key]) files[key] = loadFile(key, file)
  return await files[key]
}

export const HevcVideo = ({ src, ...props }: { src: string; className?: string; style?: CSSProperties }) => {
  const [handle] = useState(() => delayRender('hevc', { timeoutInMilliseconds: 120_000 }))
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (url) return
    getBlob(src).then((blob) => {
      setUrl(URL.createObjectURL(blob))
      continueRender(handle)
    })
  }, [src])

  if (!url) return <div {...props}>Loading video</div>
  return <Html5Video showInTimeline={false} {...props} src={url} />
}
