import * as capnp from 'capnp-ts'
import * as Log from '../capnp/log.capnp' // Adjust path as needed

// --- types ---

type CapnpValue = {
  which?: () => number
  [key: string]: any
}

type CapnpStructClass = {
  _capnp: { displayName: string }
  [key: string]: any
}

// --- Helpers ---

/**
 * Converts a Cap'n Proto object to a plain JSON object with lazy getters.
 * Replaces Node Buffer logic with Uint8Array/TextDecoder.
 */
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

    // Convert camelCase to CAPS_CASE to find the union index in the struct
    for (let i = 0; i < name.length; ++i) {
      if (name[i].toLowerCase() !== name[i]) {
        if (wasLower) capsName += '_'
        wasLower = false
      } else wasLower = true
      capsName += name[i].toUpperCase()
    }

    // Union handling: only access if it matches the active union field
    if (which !== -1 && struct![capsName] !== undefined && which !== struct![capsName]) {
      return
    }

    // Define lazy getter
    Object.defineProperty(data, name, {
      enumerable: true,
      configurable: true,
      get: () => {
        let value = capnpObject[method]()

        // Handle primitive/special types
        if (value?.constructor) {
          const typeName = value.constructor.name
          if (typeName === 'Uint64' || typeName === 'Int64') {
            value = value.toString()
          } else if (typeName === 'Data') {
            // Capnp Data -> Base64 String
            const uint8 = value.toUint8Array()
            let binary = ''
            const len = uint8.byteLength
            for (let i = 0; i < len; i++) binary += String.fromCharCode(uint8[i])
            value = btoa(binary)
          } else if (typeName === 'Pointer') {
            // Text handling
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
            // Recursion for structs
            value = toJSON(value)
          }
        }

        // Cache the result
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

/**
 * Calculates the full size of a Cap'n Proto message (header + body)
 * based on the buffer at offset 0.
 */
const getMessageSize = (view: DataView): number | null => {
  if (view.byteLength < 8) return null

  // Segment count is the first 4 bytes (little endian) + 1
  const segmentCount = view.getUint32(0, true) + 1

  // Header size: 4 bytes (count) + 4 bytes per segment size
  const headerSize = 4 + segmentCount * 4

  // The header itself is padded to an 8-byte boundary
  const paddedHeaderSize = headerSize + (headerSize % 8 === 0 ? 0 : 8 - (headerSize % 8))

  if (view.byteLength < paddedHeaderSize) return null

  // Sum up segment sizes
  let totalBodySize = 0
  for (let i = 0; i < segmentCount; i++) {
    // Offset: 4 bytes (count) + i * 4 (segment sizes)
    const segmentWords = view.getUint32(4 + i * 4, true)
    totalBodySize += segmentWords * 8 // Convert words to bytes
  }

  return paddedHeaderSize + totalBodySize
}

// --- Main Reader Logic ---

/**
 * Reads a stream, handles buffering/framing, and yields parsed JSON objects.
 */
export async function* LogReader(stream: ReadableStream<Uint8Array>): AsyncGenerator<any, void, unknown> {
  const reader = stream.getReader()
  let buffer = new Uint8Array(0)

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // Append new chunk to buffer
      const temp = new Uint8Array(buffer.length + value.length)
      temp.set(buffer)
      temp.set(value, buffer.length)
      buffer = temp

      // Process complete messages in buffer
      while (true) {
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        const msgSize = getMessageSize(view)

        if (!msgSize || buffer.byteLength < msgSize) {
          break // Wait for more data
        }

        // Extract message bytes
        const msgBytes = buffer.subarray(0, msgSize)

        // Create Capnp Message (ensure generic copy to avoid memory issues if stream is large)
        // We copy because capnp-ts might hold references, and we are slicing a shifting buffer.
        const msgCopy = new Uint8Array(msgBytes)
        const message = new capnp.Message(msgCopy, false)

        // Decode and Yield
        // Assuming 'Log.Event' is your root struct
        const event = message.getRoot(Log.Event)
        yield toJSON(event)

        // Advance buffer
        buffer = buffer.subarray(msgSize)
      }
    }
  } finally {
    reader.releaseLock()
  }
}
