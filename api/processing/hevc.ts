import { $ } from 'bun'
import { mkdirSync, rmSync } from 'fs'

const TMP_DIR = '/tmp/hevc-processing'
mkdirSync(TMP_DIR, { recursive: true })

// Remux HEVC to MP4 using ffmpeg (lossless, just changes container)
// Returns a ReadableStream of the MP4 data
export const remuxHevcToMp4 = async (hevcStream: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> => {
  const id = crypto.randomUUID()
  const hevcPath = `${TMP_DIR}/${id}.hevc`
  const mp4Path = `${TMP_DIR}/${id}.mp4`

  try {
    // Write HEVC stream to temp file
    const hevcData = await new Response(hevcStream).arrayBuffer()
    await Bun.write(hevcPath, hevcData)

    // Remux to MP4 with faststart for streaming
    await $`ffmpeg -y -i ${hevcPath} -c:v copy -movflags faststart ${mp4Path}`.quiet()

    // Read MP4 and return as stream
    const mp4File = Bun.file(mp4Path)
    const mp4Data = await mp4File.arrayBuffer()

    // Clean up temp files
    rmSync(hevcPath, { force: true })
    rmSync(mp4Path, { force: true })

    return new Response(mp4Data).body!
  } catch (e) {
    // Clean up on error
    rmSync(hevcPath, { force: true })
    rmSync(mp4Path, { force: true })
    throw e
  }
}
