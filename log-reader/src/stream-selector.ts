import { Transform } from 'stream'

type Options = {
  minBuffer?: number
  selector: (buf: Buffer, encoding: BufferEncoding, cb: (err: any, buf: any) => void) => Transform
}
export class StreamSelector extends Transform {
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
