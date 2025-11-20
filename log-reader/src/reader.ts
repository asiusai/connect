import { CapnpStream } from './stream'
import { Event } from './geval'
import { StreamSelector } from './stream-selector'
import capnp from 'capnp-ts'
import * as Log from '../capnp/log.capnp'
import { toJSON } from './capnp-json'

export const eventToJSON = (buf: Buffer, struct?: any) => toJSON(new capnp.Message(buf, false).getRoot(Log.Event), struct)

export type StreamReaderOptions = { isBinary?: boolean }
export const StreamReader = (inputStream: StreamSelector, options: StreamReaderOptions = {}) => {
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
