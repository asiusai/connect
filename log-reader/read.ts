import { getSmartLogStream, LogReader } from './index'

const FILE = 'rlog.zst'

try {
  const rawStream = Bun.file(FILE).stream()
  const stream = await getSmartLogStream(rawStream)
  for await (const event of LogReader(stream)) {
    console.log(Object.keys(event))
    if ('DrivingModelData' in event) console.log(event.DrivingModelData.Action.ShouldStop)
  }
} catch (err) {
  console.error('Error parsing stream:', err)
}
