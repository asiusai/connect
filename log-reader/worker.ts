import { LogReader } from './index'

const WIDTH = 1928
const HEIGHT = 1208

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

self.onmessage = async (e) => {
  const { url } = e.data
  if (!url) return

  try {
    const res = await fetch(url)
    if (!res.ok || !res.body) {
      self.postMessage({ error: 'Failed to fetch log' })
      return
    }

    const reader = LogReader(res.body)
    const paths: Record<string, string> = {}

    for await (const event of reader) {
      if ('ModelV2' in event) {
        const { X, Y, Z } = event.ModelV2.Position
        const leftPoints: { x: number; y: number }[] = []
        const rightPoints: { x: number; y: number }[] = []

        for (let i = 0; i < X.length; i++) {
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

        const pathData = `M ${leftPoints[0].x.toFixed(0)} ${leftPoints[0].y.toFixed(0)} ${leftPoints
          .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
          .join(' ')} ${rightPoints
          .reverse()
          .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
          .join(' ')} Z`

        paths[event.ModelV2.FrameId.toFixed(0)] = pathData
      }
    }

    self.postMessage({ paths })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
