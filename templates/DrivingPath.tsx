import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { WIDTH, HEIGHT } from './shared'
import { useEffect, useState } from 'react'
import { Files } from '../src/types'
import Worker from '../log-reader/worker?worker'
import { DB } from '../src/utils/db'

const db = new DB()

export const DrivingPath = ({ files, routeName }: { files: Files; routeName: string }) => {
  const frame = useCurrentFrame()

  const [data, setData] = useState<Record<string, string>>()
  const logs = files.logs

  useEffect(() => {
    if (data) return

    const loadLogs = async () => {
      await db.init()
      const workers: Worker[] = []

      for (let i = 0; i < logs.length; i++) {
        const url = logs[i]
        const cacheKey = `${routeName}--${i}`
        const cached = await db.get<string>(cacheKey)

        if (cached) {
          setData((prev) => ({ ...prev, ...JSON.parse(cached) }))
          continue
        }

        const worker = new Worker()
        workers.push(worker)

        worker.onmessage = async (e) => {
          const { paths, error } = e.data
          if (paths) {
            setData((prev) => ({ ...prev, ...paths }))
            await db.set(cacheKey, JSON.stringify(paths))
          }

          if (error) console.error('Worker error:', error)
          worker.terminate()
        }

        worker.postMessage({ url })
      }
    }

    loadLogs()
  }, [logs, routeName]) // Only run once when logs change

  const d = data?.[frame.toFixed(0)]
  return (
    <AbsoluteFill>
      {d ? (
        <svg width={WIDTH} height={HEIGHT} style={{ overflow: 'visible' }}>
          <path d={d} fill="rgba(0, 255, 0, 0.4)" stroke="none" />
        </svg>
      ) : (
        <div></div>
      )}
    </AbsoluteFill>
  )
}
