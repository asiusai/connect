import { readLogs, ReadLogsInput } from './reader'

self.onmessage = async ({ data }: { data: ReadLogsInput }) => {
  try {
    const frames = await readLogs(data)
    self.postMessage({ frames })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
