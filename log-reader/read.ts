import { LogReader } from './src/index'

const FILE = 'rlog'

try {
  const stream = Bun.file(FILE).stream()
  for await (const event of LogReader(stream)) {
    if ('DrivingModelData' in event) console.log(event.DrivingModelData.Action.ShouldStop)
  }
} catch (err) {
  console.error('Error parsing stream:', err)
}
