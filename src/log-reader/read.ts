import { LogReader } from './index'

const FILE = 'rlog.zst'

try {
  const stream = Bun.file(FILE).stream()
  for await (const event of LogReader(stream)) {
    console.log(Object.keys(event))
    if ('DrivingModelData' in event) console.log(event.DrivingModelData.Action.ShouldStop)
  }
} catch (err) {
  console.error('Error parsing stream:', err)
}
