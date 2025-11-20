import { StreamReader, StreamReaderOptions } from './reader'
import { StreamSelector } from './stream-selector'
import { PassThrough } from 'stream'
import fs from 'fs'

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
