import { readLogs, ReadLogsInput } from './reader'

self.onmessage = async ({ data }: { data: ReadLogsInput }) => {
  try {
    const result = await readLogs(data)
    self.postMessage(result)
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
