import { FFmpeg } from '@ffmpeg/ffmpeg'

export let ffmpeg: FFmpeg
export const init = async () => {
  if (ffmpeg) return
  ffmpeg = new FFmpeg()
  // ffmpeg.on('log', ({ message }) => console.log(message))
  await ffmpeg.load()
}

export type DownloadProgress = { loaded: number; length: number; percent: number }
export type OnDownloadProgress = (p: DownloadProgress) => void

export const downloadFile = async (url: string, onLoad: OnDownloadProgress): Promise<Uint8Array> => {
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
    onLoad({ loaded, length, percent: loaded / length })
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
export const hevcToMp4 = async (file: string | Uint8Array, onLoad: OnDownloadProgress) => {
  await init()
  const bin = typeof file === 'string' ? await downloadFile(file, onLoad) : file
  await ffmpeg.writeFile('input.hevc', new Uint8Array(bin))
  await ffmpeg.exec(['-r', '20', '-i', 'input.hevc', '-c', 'copy', '-map', '0', '-vtag', 'hvc1', 'output.mp4'])
  const data = await ffmpeg.readFile('output.mp4')
  return new Blob([(data as any).buffer], { type: 'video/mp4' })
}

export const hevcStreamToMp4 = async (file: string | Uint8Array, onLoad?: OnDownloadProgress) => {
  await init()
  const bin = typeof file === 'string' ? await downloadFile(file, onLoad || (() => {})) : file
  await ffmpeg.writeFile('input.hevc', new Uint8Array(bin))
  await ffmpeg.exec([
    '-r',
    '20',
    '-i',
    'input.hevc',
    '-c',
    'copy',
    '-movflags',
    'frag_keyframe+empty_moov+default_base_moof',
    '-map',
    '0',
    '-vtag',
    'hvc1',
    'output.mp4',
  ])
  const data = await ffmpeg.readFile('output.mp4')
  return new Uint8Array<ArrayBuffer>((data as any).buffer)
}
