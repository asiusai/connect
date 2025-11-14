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

type Load = { loaded: number; length: number }
type OnLoad = (p: Load) => void

const download = async (url: string, onLoad: OnLoad): Promise<Uint8Array> => {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error('Failed to fetch')

  const length = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()

  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    loaded += value.length
    onLoad({ loaded, length })
  }

  // merge chunks into a single Uint8Array
  const result = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

const convert = async (file: string, onLoad: OnLoad) => {
  await loaded
  const bin = await download(file, onLoad)
  await ffmpeg.writeFile('input.hevc', new Uint8Array(bin))
  await ffmpeg.exec(['-r', '20', '-i', 'input.hevc', '-c', 'copy', '-map', '0', '-vtag', 'hvc1', 'output.mp4'])
  const data = await ffmpeg.readFile('output.mp4')
  return new Blob([(data as any).buffer], { type: 'video/mp4' })
}

const getBlob = async (file: string, onLoad: OnLoad) => {
  const key = new URL(file).origin + new URL(file).pathname

  const loadFile = async () => {
    const db = await new DB().init()
    let res = await db.get<Blob>(key)
    if (res) return res

    res = await convert(file, onLoad)
    await db.set(key, res)
    return res
  }

  if (!files[key]) files[key] = loadFile()
  return await files[key]
}

export const HevcVideo = ({ src, name, ...props }: { src: string; className?: string; style?: CSSProperties; name: string }) => {
  const [handle] = useState(() => delayRender('hevc', { timeoutInMilliseconds: 120_000 }))
  const [url, setUrl] = useState<string>()
  const [load, setLoad] = useState<Load>()
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
  return <Html5Video showInTimeline={false} {...props} src={url} />
}
