import { FFmpeg } from '@ffmpeg/ffmpeg'

export let ffmpeg: FFmpeg

let loadingPromise: Promise<boolean> | null = null
export const init = async () => {
  if (!ffmpeg) ffmpeg = new FFmpeg()

  if (!loadingPromise) loadingPromise = ffmpeg.load()

  await loadingPromise
}

export type DownloadProgress = { loaded: number; length: number; percent: number }
export type OnDownloadProgress = (p: DownloadProgress) => void

export const downloadFile = async (url: string, onLoad: OnDownloadProgress): Promise<Uint8Array> => {
  const [head, res] = await Promise.all([fetch(url, { method: 'HEAD' }).catch(() => null), fetch(url)])
  if (!res.ok || !res.body) throw new Error('Failed to fetch')

  const length = Number(head?.headers.get('content-length') || res.headers.get('content-length')) || 0
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
const randomName = (ext: string) => `${(Math.random() * 100000).toFixed(0)}.${ext}`
export const hevcToMp4 = async (file: string | Uint8Array, onLoad: OnDownloadProgress = () => {}) => {
  await init()
  const bin = typeof file === 'string' ? await downloadFile(file, onLoad) : file
  const input = randomName('hevc')
  const output = randomName('mp4')
  await ffmpeg.writeFile(input, new Uint8Array(bin))
  await ffmpeg.exec(['-r', '20', '-i', input, '-c', 'copy', '-map', '0', '-vtag', 'hvc1', output])
  const data = await ffmpeg.readFile(output)
  return new Blob([(data as any).buffer], { type: 'video/mp4' })
}

export const hevcStreamToMp4 = async (file: string | Uint8Array, onLoad?: OnDownloadProgress) => {
  await init()
  const bin = typeof file === 'string' ? await downloadFile(file, onLoad || (() => {})) : file
  const input = randomName('hevc')
  const output = randomName('mp4')
  await ffmpeg.writeFile(input, new Uint8Array(bin))
  await ffmpeg.exec(['-r', '20', '-i', input, '-c', 'copy', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-map', '0', '-vtag', 'hvc1', output])
  const data = await ffmpeg.readFile(output)
  return new Uint8Array<ArrayBuffer>((data as any).buffer)
}

export const hevcBinsToMp4 = async (bins: Uint8Array[]) => {
  await init()

  const inputs = bins.map((_, i) => `input_${i}.hevc`)
  for (let i = 0; i < bins.length; i++) await ffmpeg.writeFile(inputs[i], bins[i])

  await ffmpeg.writeFile('concat.txt', inputs.map((f) => `file '${f}'`).join('\n'))

  const output = randomName('mp4')
  await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-r', '20', '-i', 'concat.txt', '-c', 'copy', '-vtag', 'hvc1', output])

  const data = await ffmpeg.readFile(output)

  for (const name of inputs) await ffmpeg.deleteFile(name)
  await ffmpeg.deleteFile('concat.txt')
  await ffmpeg.deleteFile(output)

  return new Blob([(data as any).buffer], { type: 'video/mp4' })
}

export const tsFilesToMp4 = async (urls: (string | undefined)[], onProgress?: (loaded: number, total: number) => void) => {
  await init()

  let loaded = 0

  const inputs = await Promise.all(
    urls.map(async (url, i) => {
      const bin = await downloadFile(url!, (p) => onProgress?.(loaded + p.loaded, urls.length * p.length))
      loaded += bin.length
      return [`input_${i}.ts`, bin] as const
    }),
  )
  for (const [name, bin] of inputs) await ffmpeg.writeFile(name, bin)

  await ffmpeg.writeFile('concat.txt', inputs.map(([f]) => `file '${f}'`).join('\n'))

  const output = randomName('mp4')
  await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', output])

  const data = await ffmpeg.readFile(output)

  for (const [name] of inputs) await ffmpeg.deleteFile(name)
  await ffmpeg.deleteFile('concat.txt')
  await ffmpeg.deleteFile(output)

  return new Blob([(data as any).buffer], { type: 'video/mp4' })
}
