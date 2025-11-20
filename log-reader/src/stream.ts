import stream from 'stream'
import { readSize } from './buffer'

export class CapnpStream extends stream.Writable {
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
