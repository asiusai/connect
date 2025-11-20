import { CapnpStream } from './stream'
import { Event as EventWrapper } from './event'
import { Event } from './geval'
import { StreamSelector } from './stream-selector'

export type StreamReaderOptions = {
  isBinary?: boolean
}
export const StreamReader = (inputStream: StreamSelector, options: StreamReaderOptions = {}) => {
  const event = Event()
  const capnpStream = new CapnpStream()
  let isStarted = false

  capnpStream.on('message', (buf) => {
    if (!options.isBinary) event.broadcast(EventWrapper(buf).toJSON())
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
