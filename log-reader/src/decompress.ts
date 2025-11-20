import { streamReader } from './reader'
import { StreamSelector } from './stream-selector'
import { PassThrough } from 'stream'
import fs from 'fs'

export const Reader = (inputStream: fs.ReadStream, options = {}) => {
  var selectorStream = StreamSelector({
    minBuffer: 6,
    selector: () => new PassThrough(),
  })

  selectorStream.on('error', (err: any) => {
    throw err
  })
  inputStream.pipe(selectorStream)

  return streamReader(selectorStream, options)
}
