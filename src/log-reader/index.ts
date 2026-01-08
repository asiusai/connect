import * as capnp from 'capnp-ts'
import * as Log from './capnp/log.capnp'
import { Decompress } from 'fzstd'
// @ts-expect-error
import * as WasmBz2 from '@commaai/wasm-bz2'

// --- Types ---

type CapnpStructClass = {
  _capnp: { displayName: string }
  [key: string]: any
}

// --- Helpers ---

const toJSON = (capnpObject: any, struct?: CapnpStructClass): any => {
  if (typeof capnpObject !== 'object' || !capnpObject._capnp) return capnpObject
  if (Array.isArray(capnpObject)) return capnpObject.map((x) => toJSON(x))
  if (capnpObject.constructor._capnp.displayName.startsWith('List')) {
    return capnpObject.toArray().map((n: any) => toJSON(n))
  }

  if (!struct) struct = capnpObject.constructor as CapnpStructClass

  const which = capnpObject.which ? capnpObject.which() : -1
  const data: Record<string, any> = {}
  const proto = Object.getPrototypeOf(capnpObject)

  Object.getOwnPropertyNames(proto).forEach((method) => {
    if (!method.startsWith('get')) return
    const name = method.substr(3)
    let capsName = ''
    let wasLower = false

    for (let i = 0; i < name.length; ++i) {
      if (name[i].toLowerCase() !== name[i]) {
        if (wasLower) capsName += '_'
        wasLower = false
      } else wasLower = true
      capsName += name[i].toUpperCase()
    }

    if (which !== -1 && struct![capsName] !== undefined && which !== struct![capsName]) return

    Object.defineProperty(data, name, {
      enumerable: true,
      configurable: true,
      get: () => {
        let value = capnpObject[method]()

        if (value?.constructor) {
          const typeName = value.constructor.name
          if (typeName === 'Uint64' || typeName === 'Int64') {
            value = value.toString()
          } else if (typeName === 'Data') {
            const uint8 = value.toUint8Array()
            let binary = ''
            const len = uint8.byteLength
            for (let i = 0; i < len; i++) binary += String.fromCharCode(uint8[i])
            value = btoa(binary)
          } else if (typeName === 'Pointer') {
            try {
              let dataArr = capnp.Data.fromPointer(value).toUint8Array()
              if (dataArr.byteLength > 0 && dataArr[dataArr.byteLength - 1] === 0) {
                dataArr = dataArr.subarray(0, dataArr.byteLength - 1)
              }
              value = new TextDecoder().decode(dataArr)
            } catch {
              value = undefined
            }
          } else {
            value = toJSON(value)
          }
        }

        Object.defineProperty(data, name, {
          configurable: false,
          writable: false,
          value: value,
        })
        return value
      },
    })
  })

  return data
}

const getMessageSize = (view: DataView): number | null => {
  if (view.byteLength < 8) return null
  const segmentCount = view.getUint32(0, true) + 1
  const headerSize = 4 + segmentCount * 4
  const paddedHeaderSize = headerSize + (headerSize % 8 === 0 ? 0 : 8 - (headerSize % 8))
  if (view.byteLength < paddedHeaderSize) return null

  let totalBodySize = 0
  for (let i = 0; i < segmentCount; i++) {
    const segmentWords = view.getUint32(4 + i * 4, true)
    totalBodySize += segmentWords * 8
  }
  return paddedHeaderSize + totalBodySize
}

// --- Streaming Logic ---

const ZSTD_MAGIC = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd])

const createZstdDecompressor = () => {
  let decompressor: Decompress

  return new TransformStream<Uint8Array, Uint8Array>({
    start: (controller) => {
      decompressor = new Decompress((chunk) => controller.enqueue(chunk))
    },
    transform: (chunk) => decompressor.push(chunk),
    flush: () => decompressor.push(new Uint8Array(0), true),
  })
}

const BZ2_MAGIC = new Uint8Array([0x42, 0x5a, 0x68])

const createBz2Decompressor = () => {
  let ref: any

  return new TransformStream<Uint8Array, Uint8Array>({
    start: async (controller) => {
      ref = await WasmBz2.start()
      ref.onData((chunk: Uint8Array) => controller.enqueue(chunk))
    },
    transform: (chunk) => {
      if (ref) WasmBz2.sendNextChunk(ref, chunk)
    },
    flush: async () => {
      if (ref) {
        WasmBz2.flush(ref)
        await WasmBz2.finish(ref)
      }
    },
  })
}

const getSmartLogStream = async (inputStream: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> => {
  const reader = inputStream.getReader()
  const { value: firstChunk, done } = await reader.read()

  if (done) {
    reader.releaseLock()
    return new ReadableStream()
  }

  let isZstd = false
  if (firstChunk.length >= 4) {
    isZstd = firstChunk[0] === ZSTD_MAGIC[0] && firstChunk[1] === ZSTD_MAGIC[1] && firstChunk[2] === ZSTD_MAGIC[2] && firstChunk[3] === ZSTD_MAGIC[3]
  }

  let isBz2 = false
  if (firstChunk.length >= 3) {
    isBz2 = firstChunk[0] === BZ2_MAGIC[0] && firstChunk[1] === BZ2_MAGIC[1] && firstChunk[2] === BZ2_MAGIC[2]
  }

  const stitchedStream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      controller.enqueue(firstChunk)
    },
    pull: async (controller) => {
      try {
        const { value, done } = await reader.read()
        if (done) controller.close()
        else controller.enqueue(value)
      } catch (e) {
        controller.error(e)
      }
    },
    cancel: (reason) => {
      reader.cancel(reason)
    },
  })

  if (isZstd) return stitchedStream.pipeThrough(createZstdDecompressor())
  if (isBz2) return stitchedStream.pipeThrough(createBz2Decompressor())
  return stitchedStream
}

class ChunkBuffer {
  private chunks: Uint8Array[] = []
  private totalLength = 0
  private offset = 0 // Offset in the first chunk

  add(chunk: Uint8Array) {
    if (chunk.length === 0) return
    this.chunks.push(chunk)
    this.totalLength += chunk.length
  }

  get length() {
    return this.totalLength
  }

  // Peek at the first 'size' bytes without consuming
  peek(size: number): Uint8Array | null {
    if (this.totalLength < size) return null

    // Optimization: if the first chunk has enough data, return a subarray view
    if (this.chunks[0].length - this.offset >= size) {
      return this.chunks[0].subarray(this.offset, this.offset + size)
    }

    // Otherwise, we need to stitch chunks together
    const result = new Uint8Array(size)
    let copied = 0
    let currentChunkIdx = 0
    let currentOffset = this.offset

    while (copied < size) {
      const chunk = this.chunks[currentChunkIdx]
      const remaining = chunk.length - currentOffset
      const toCopy = Math.min(remaining, size - copied)

      result.set(chunk.subarray(currentOffset, currentOffset + toCopy), copied)

      copied += toCopy
      currentOffset += toCopy
      if (currentOffset === chunk.length) {
        currentChunkIdx++
        currentOffset = 0
      }
    }
    return result
  }

  // Consume 'size' bytes, returning them as a single Uint8Array
  read(size: number): Uint8Array | null {
    if (this.totalLength < size) return null

    // Optimization: if the first chunk has enough data
    if (this.chunks[0].length - this.offset >= size) {
      const result = this.chunks[0].subarray(this.offset, this.offset + size)
      this.offset += size
      this.totalLength -= size

      // Cleanup empty first chunk
      if (this.offset === this.chunks[0].length) {
        this.chunks.shift()
        this.offset = 0
      }
      return result
    }

    // Otherwise, stitch and consume
    const result = new Uint8Array(size)
    let copied = 0

    while (copied < size) {
      const chunk = this.chunks[0]
      const remaining = chunk.length - this.offset
      const toCopy = Math.min(remaining, size - copied)

      result.set(chunk.subarray(this.offset, this.offset + toCopy), copied)

      copied += toCopy
      this.offset += toCopy
      this.totalLength -= toCopy

      if (this.offset === chunk.length) {
        this.chunks.shift()
        this.offset = 0
      }
    }
    return result
  }
}

export async function* LogReader(stream: ReadableStream<Uint8Array>): AsyncGenerator<any, void, unknown> {
  stream = await getSmartLogStream(stream)
  const reader = stream.getReader()
  const buffer = new ChunkBuffer()

  try {
    while (true) {
      // Read loop
      const { done, value } = await reader.read()
      if (value) buffer.add(value)

      // Process loop
      while (true) {
        // First peek 4 bytes to get segment count, then calculate required header size
        const countPeek = buffer.peek(4)
        if (!countPeek) break

        const segmentCount = new DataView(countPeek.buffer, countPeek.byteOffset, 4).getUint32(0, true) + 1
        const headerSize = 4 + segmentCount * 4
        const paddedHeaderSize = headerSize + (headerSize % 8 === 0 ? 0 : 8 - (headerSize % 8))

        // Peek enough for the full header
        const headerPeek = buffer.peek(paddedHeaderSize)
        if (!headerPeek) break

        const view = new DataView(headerPeek.buffer, headerPeek.byteOffset, headerPeek.byteLength)
        const msgSize = getMessageSize(view)

        if (!msgSize) break

        if (buffer.length < msgSize) {
          // We know the size, but don't have the full message yet
          break
        }

        // We have the full message!
        const msgBytes = buffer.read(msgSize)
        if (!msgBytes) throw new Error('Unexpected buffer underflow') // Should not happen due to check above

        // capnp-ts requires a copy if the buffer is a subarray of a larger buffer that might be overwritten?
        // In our case, 'msgBytes' is either a fresh allocation (from stitching) or a subarray of a chunk.
        // If it's a subarray, it's safe as long as we don't modify the underlying chunk (we don't).
        // However, capnp-ts might expect a clean buffer or specific alignment.
        // Let's try passing it directly.

        // Note: capnp.Message expects the data to be 8-byte aligned if it's a typed array?
        // Actually it just takes Uint8Array.

        const message = new capnp.Message(msgBytes, false)
        const event = message.getRoot(Log.Event)
        yield toJSON(event)
      }

      if (done) break
    }
  } finally {
    reader.releaseLock()
  }
}
