import { CapnpStream } from './stream'
import { Event as EventWrapper } from './event'
import { Event } from './geval'

export const streamReader = (inputStream, options = {}) => {
  const event = Event()
  const capnpStream = new CapnpStream()
  const isBinary = !!options.binary

  var isStarted = false

  capnpStream.on('message', (buf) => {
    if (!isBinary) {
      event.broadcast(EventWrapper(buf).toJSON())
    } else {
      event.broadcast(buf)
    }
  })

  return (fn) => {
    if (!isStarted) {
      isStarted = true
      inputStream.pipe(capnpStream)
    }

    return event.listen(fn)
  }
}
