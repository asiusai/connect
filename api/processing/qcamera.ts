import { $ } from 'bun'

const SPRITE_WIDTH = 128
const SPRITE_HEIGHT = 96
const SPRITE_SEEK_SECONDS = 5 // Seek to 5 seconds (matches comma API)

export const extractSprite = async (videoStream: ReadableStream<Uint8Array>): Promise<Uint8Array | null> => {
  try {
    // Write stream to temp file since ffmpeg needs seekable input for .ts files
    const tempInput = `/tmp/qcamera-${Date.now()}.ts`
    const tempOutput = `/tmp/sprite-${Date.now()}.jpg`

    const chunks: Uint8Array[] = []
    const reader = videoStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }

    const videoData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      videoData.set(chunk, offset)
      offset += chunk.length
    }

    await Bun.write(tempInput, videoData)

    // Extract frame from middle of video as thumbnail, scaled to sprite size
    const result =
      await $`ffmpeg -y -ss ${SPRITE_SEEK_SECONDS} -i ${tempInput} -vframes 1 -vf scale=${SPRITE_WIDTH}:${SPRITE_HEIGHT} -q:v 2 -update 1 ${tempOutput}`.quiet()

    if (result.exitCode !== 0) {
      console.error('ffmpeg failed:', result.stderr.toString())
      await $`rm -f ${tempInput} ${tempOutput}`.quiet()
      return null
    }

    const spriteData = await Bun.file(tempOutput).arrayBuffer()
    await $`rm -f ${tempInput} ${tempOutput}`.quiet()

    return new Uint8Array(spriteData)
  } catch (e) {
    console.error('Failed to extract sprite:', e)
    return null
  }
}

export const extractSpriteFromFile = async (filePath: string): Promise<Uint8Array | null> => {
  try {
    const tempOutput = `/tmp/sprite-${Date.now()}.jpg`

    // Extract frame from middle of video as thumbnail, scaled to sprite size
    const result =
      await $`ffmpeg -y -ss ${SPRITE_SEEK_SECONDS} -i ${filePath} -vframes 1 -vf scale=${SPRITE_WIDTH}:${SPRITE_HEIGHT} -q:v 2 -update 1 ${tempOutput}`.quiet()

    if (result.exitCode !== 0) {
      console.error('ffmpeg failed:', result.stderr.toString())
      await $`rm -f ${tempOutput}`.quiet()
      return null
    }

    const spriteData = await Bun.file(tempOutput).arrayBuffer()
    await $`rm -f ${tempOutput}`.quiet()

    return new Uint8Array(spriteData)
  } catch (e) {
    console.error('Failed to extract sprite:', e)
    return null
  }
}
