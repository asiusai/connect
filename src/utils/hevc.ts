export const findNalUnitStart = (buffer: Uint8Array, offset = 0) => {
  for (let i = offset; i < buffer.length - 2; i++) {
    if (buffer[i] === 0 && buffer[i + 1] === 0 && buffer[i + 2] === 1) return i
  }
  return
}

export const getAllNals = (buffer: Uint8Array) => {
  const nals = []
  for (let i = 0; i < buffer.length; i++) {
    const nal = findNalUnitStart(buffer, i)
    if (nal === undefined) break
    nals.push(nal)
    i = nal
  }
  return nals
}

export const extractHevcHeaders = (buffer: Uint8Array) => {
  const nals = getAllNals(buffer)
  const headers: Uint8Array[] = []

  for (let i = 0; i < nals.length; i++) {
    const start = nals[i]
    const end = i < nals.length - 1 ? nals[i + 1] : buffer.length

    // Check NAL unit type
    // Start code is 00 00 01 (3 bytes)
    // So header byte is at start + 3
    const headerByte = buffer[start + 3]
    const nalType = (headerByte >> 1) & 0x3f

    // VPS (32), SPS (33), PPS (34)
    if (nalType >= 32 && nalType <= 34) {
      headers.push(buffer.slice(start, end))
    }
  }

  // Combine headers
  const totalLength = headers.reduce((acc, h) => acc + h.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const h of headers) {
    result.set(h, offset)
    offset += h.length
  }

  return result.length > 0 ? result : null
}

export const stripMp4Headers = (buffer: Uint8Array<ArrayBuffer>) => {
  let offset = 0
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  while (offset < buffer.length) {
    const size = view.getUint32(offset)
    const type = String.fromCharCode(view.getUint8(offset + 4), view.getUint8(offset + 5), view.getUint8(offset + 6), view.getUint8(offset + 7))

    if (type === 'moof') {
      return buffer.slice(offset)
    }

    offset += size
  }
  return buffer
}

export async function* createChunker(stream: ReadableStream<Uint8Array>, targetChunkSize: number): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader()
  let buffer = new Uint8Array(0)

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const newBuffer = new Uint8Array(buffer.length + value.length)
      newBuffer.set(buffer)
      newBuffer.set(value, buffer.length)
      buffer = newBuffer

      while (buffer.length >= targetChunkSize) {
        // Search for a Keyframe (IRAP) NAL unit to split at
        // NAL types 16-23 are IRAP (BLA, IDR, CRA)
        let splitIndex = -1
        let searchOffset = targetChunkSize

        while (searchOffset < buffer.length) {
          const nalStart = findNalUnitStart(buffer, searchOffset)
          if (nalStart === undefined) break

          // Check NAL type
          // Start code is 00 00 01. Header is at +3.
          if (nalStart + 3 < buffer.length) {
            const nalType = (buffer[nalStart + 3] >> 1) & 0x3f
            if (nalType >= 16 && nalType <= 23) {
              splitIndex = nalStart
              break
            }
          }
          // Continue searching from next byte
          searchOffset = nalStart + 3
        }

        if (splitIndex !== -1) {
          yield buffer.slice(0, splitIndex)
          buffer = buffer.slice(splitIndex)
        } else {
          // No keyframe found yet.
          // If buffer is getting too huge (e.g. > 20MB), we might be in trouble (no keyframes?)
          // But for now, just wait for more data.
          break
        }
      }
    }

    if (buffer.length > 0) yield buffer
  } finally {
    reader.releaseLock()
  }
}
