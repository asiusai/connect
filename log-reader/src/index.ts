import fs from 'fs'
import capnp from 'capnp-ts'
import { Transform, Writable, PassThrough } from 'stream'
import * as Log from '../capnp/log.capnp'

const assignGetter = (data: any, name: string, capnpObject: any, method: any) => {
  Object.defineProperty(data, name, {
    enumerable: true,
    configurable: true,
    get: () => {
      let value = capnpObject[method]()
      switch (value.constructor.name) {
        case 'Uint64':
        case 'Int64':
          // just tostring all 64 bit ints
          value = value.toString()
          break
        case 'Data':
          value = Buffer.from(value.toUint8Array()).toString('base64')
          break
        case 'Pointer':
          try {
            let dataArr = capnp.Data.fromPointer(value).toUint8Array()
            if (dataArr[dataArr.length - 1] === 0) {
              // exclude null terminator if present
              dataArr = dataArr.subarray(0, dataArr.length - 1)
            }
            value = new TextDecoder().decode(dataArr)
          } catch (err) {
            value = undefined
          }
          break
        default:
          value = toJSON(value)
          break
      }
      Object.defineProperty(data, name, {
        configurable: false,
        writable: false,
        value: value,
      })
      return value
    },
  })
}
const readSize = (buf: Buffer, offset: number = 0) => {
  if (offset + 8 >= buf.byteLength) return null

  const segments = buf.readUInt32LE(offset) + 1

  let localIndex = 0
  const sizeArr = []
  for (let i = 0; i < segments; ++i) {
    localIndex += 4
    const segSize = buf.readUInt32LE(offset + localIndex)
    sizeArr.push(segSize * 8)
  }

  let size = sizeArr.reduce((memo, val) => memo + val, localIndex)

  // round size to the word boundary, that reduce statement already took into account header size
  size += 8 - (size % 8)

  return size
}

const toJSON = (capnpObject?: any, struct?: any): any => {
  if (typeof capnpObject !== 'object' || !capnpObject._capnp) return capnpObject
  if (Array.isArray(capnpObject)) return capnpObject.map(toJSON)

  if (!struct) struct = capnpObject.constructor

  let which = capnpObject.which ? capnpObject.which() : -1
  let unionCapsName = null
  let unionName = null

  if (capnpObject.constructor._capnp.displayName.startsWith('List')) return capnpObject.toArray().map((n: any) => toJSON(n))

  let data = {}

  const proto = Object.getPrototypeOf(capnpObject)
  Object.getOwnPropertyNames(proto).forEach((method) => {
    if (!method.startsWith('get')) return
    let name = method.substr(3)
    let capsName = ''
    let wasLower = false

    for (let i = 0, len = name.length; i < len; ++i) {
      if (name[i].toLowerCase() !== name[i]) {
        if (wasLower) capsName += '_'

        wasLower = false
      } else wasLower = true
      capsName += name[i].toUpperCase()
    }

    if (which === struct[capsName]) {
      assignGetter(data, name, capnpObject, method)
      unionName = name
      unionCapsName = capsName
    } else if (struct[capsName] === undefined) assignGetter(data, name, capnpObject, method)
  })

  return data
}

type Message = any

class ListItem {
  constructor(
    public fn: (v: Message) => void,
    public deleted = false,
  ) {}
}

const Event = () => {
  const listeners: ListItem[] = []

  const broadcast = (value: Message) => {
    let listenersCopy = listeners.slice()
    for (let i = 0; i < listenersCopy.length; i++) {
      if (!listenersCopy[i].deleted) {
        listenersCopy[i].fn(value)
      }
    }
  }

  const listen = (listener: any) => {
    listeners.push(new ListItem(listener))

    return removeListener

    function removeListener() {
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i].fn === listener) {
          listeners[i].deleted = true
          listeners.splice(i, 1)
          break
        }
      }
    }
  }
  return { broadcast, listen }
}

type Options = {
  minBuffer?: number
  selector: (buf: Buffer, encoding: BufferEncoding, cb: (err: any, buf: any) => void) => Transform
}
class StreamSelector extends Transform {
  constructor(public options: Options) {
    super({})
  }
  curBuffer: Buffer | null = null
  destinationStream: any = null
  isDeciding: boolean = false

  assignStream = (stream: any, encoding: BufferEncoding, self: Transform, done: () => void) => {
    if (this.destinationStream === stream) return done()
    this.destinationStream = stream

    this.destinationStream.on('data', self.push.bind(self))

    this.destinationStream.on('end', () => self.push(null))
    this.destinationStream.on('error', (err: any) => self.emit('error', err))

    if (!this.curBuffer) done()
    else {
      this.destinationStream.write(this.curBuffer, encoding, done)
      this.curBuffer = null
    }
  }

  override _flush = (cb: () => void) => {
    if (this.destinationStream?.flush) this.destinationStream.flush(cb)
    else if (this.destinationStream) this.destinationStream.end(cb)
    else cb()
  }

  override _transform = (chunk: Buffer, encoding: BufferEncoding, done: () => void) => {
    if (this.destinationStream) {
      this.destinationStream.write(chunk, encoding, done)
      return
    }

    if (!this.curBuffer) this.curBuffer = chunk
    else this.curBuffer = Buffer.concat([this.curBuffer, chunk])

    if (this.options.minBuffer && this.options.minBuffer > this.curBuffer.byteLength) return done()
    if (this.isDeciding) return done()
    if (this.curBuffer.byteLength < 1) return done()

    this.isDeciding = true

    let stream = this.options.selector(this.curBuffer, encoding, (err, stream) => {
      this.isDeciding = false

      if (err) return this.emit('error', err)
      if (this.destinationStream) return this.emit('error', new Error('Cannot specific destination stream twice'))
      if (!stream) return this.emit('error', new Error('Selector method did not return an error or a destination stream'))

      this.assignStream(stream, encoding, this, done)
    })

    if (stream) {
      this.isDeciding = false
      this.assignStream(stream, encoding, this, done)
    }
  }
}

class CapnpStream extends Writable {
  curBuffer: Buffer | null
  constructor() {
    super()
    this.curBuffer = null
  }
  readNextMessage = () => {
    if (!this.curBuffer) return false
    if (this.curBuffer.byteLength < 8) {
      return false
    }
    let size = readSize(this.curBuffer)
    if (!size || size > this.curBuffer.byteLength) {
      return false
    }
    this.emit('message', this.curBuffer.slice(0, size))
    this.curBuffer = this.curBuffer.slice(size)

    return true
  }

  _write = (chunk: Buffer, _: any, done: () => void) => {
    if (!this.curBuffer) this.curBuffer = chunk
    else if (chunk.byteLength || chunk.length) this.curBuffer = Buffer.concat([this.curBuffer, chunk])
    while (this.readNextMessage());

    done()
  }
}

const eventToJSON = (buf: Buffer, struct?: any) => toJSON(new capnp.Message(buf, false).getRoot(Log.Event), struct)

type StreamReaderOptions = { isBinary?: boolean }
const StreamReader = (inputStream: StreamSelector, options: StreamReaderOptions = {}) => {
  const event = Event()
  const capnpStream = new CapnpStream()
  let isStarted = false

  capnpStream.on('message', (buf) => {
    if (!options.isBinary) event.broadcast(eventToJSON(buf))
    else event.broadcast(buf)
  })

  return (fn: any) => {
    if (!isStarted) {
      isStarted = true
      inputStream.pipe(capnpStream)
    }

    return event.listen(fn)
  }
}

export const Reader = (inputStream: fs.ReadStream, options?: StreamReaderOptions) => {
  const selectorStream = new StreamSelector({
    minBuffer: 6,
    selector: () => new PassThrough(),
  })

  selectorStream.on('error', (err: any) => {
    throw err
  })
  inputStream.pipe(selectorStream)

  return StreamReader(selectorStream, options)
}
