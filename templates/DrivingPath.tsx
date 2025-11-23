import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { WIDTH, HEIGHT } from './shared'
import { useState } from 'react'
import { Files } from '../src/types'
import { LogReader } from '../log-reader'
import { useAsyncEffect } from '../src/utils/hooks'

const intrinsics = {
  fx: 910,
  fy: 910,
  cx: WIDTH / 2,
  cy: HEIGHT / 2,
}

const CAM_HEIGHT = 2.0
const PATH_WIDTH = 1.8

const project = (x: number, y: number, z: number) => {
  const Xc = y
  const Yc = -(z - CAM_HEIGHT)
  const Zc = x

  if (Zc < 0.5) return null

  const u = intrinsics.fx * (Xc / Zc) + intrinsics.cx
  const v = intrinsics.fy * (Yc / Zc) + intrinsics.cy

  return { x: u, y: v }
}
type Point = { x: number; y: number }

export const DrivingPath = ({ files }: { files: Files }) => {
  const frame = useCurrentFrame()

  const [data, setData] = useState<Record<string, string>>()
  const logs = files.logs

  useAsyncEffect(async () => {
    if (data) return

    for (const url of logs) {
      const res = await fetch(url)
      if (!res.ok || !res.body) continue
      const reader = LogReader(res.body)

      for await (const event of reader) {
        if ('ModelV2' in event) {
          const { X, Y, Z } = event.ModelV2.Position
          const leftPoints: Point[] = []
          const rightPoints: Point[] = []

          for (let i = 0; i < X.length; i++) {
            // Calculate normal
            let dx: number, dy: number
            if (i < X.length - 1) {
              dx = X[i + 1] - X[i]
              dy = Y[i + 1] - Y[i]
            } else {
              dx = X[i] - X[i - 1]
              dy = Y[i] - Y[i - 1]
            }

            const len = Math.sqrt(dx * dx + dy * dy)
            if (len === 0) continue

            const ny = dx / len

            const l = project(X[i], Y[i] + ny * (PATH_WIDTH / 2), Z[i])
            const r = project(X[i], Y[i] - ny * (PATH_WIDTH / 2), Z[i])

            if (l && r) {
              leftPoints.push(l)
              rightPoints.push(r)
            }
          }

          if (leftPoints.length === 0) continue

          const data = `M ${leftPoints[0].x.toFixed(0)} ${leftPoints[0].y.toFixed(0)}
    ${leftPoints.map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' ')}
    ${rightPoints
      .reverse()
      .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
      .join(' ')}
    Z`
          setData((d) => ({ ...d, [event.ModelV2.FrameId.toFixed(0)]: data }))
        }
      }
    }
  }, logs)

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
