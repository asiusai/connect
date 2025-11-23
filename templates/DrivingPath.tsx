import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { WIDTH, HEIGHT } from './shared'
import { useEffect, useMemo, useState } from 'react'
import { Files } from '../src/types'
import Worker from '../log-reader/worker?worker'
import { DB } from '../src/utils/db'

const db = new DB()

type FrameData = {
  position: { X: number[]; Y: number[]; Z: number[] }
  laneLines: { X: number[]; Y: number[]; Z: number[]; prob: number }[]
  roadEdges: { X: number[]; Y: number[]; Z: number[] }[]
}

const PATH_WIDTH = 1.8

export const DrivingPath = ({ files, routeName }: { files: Files; routeName: string }) => {
  const frame = useCurrentFrame()
  const [data, setData] = useState<Record<string, FrameData>>()
  const logs = files.logs

  // Calibration State
  const [fx, setFx] = useState(910)
  const [fy, setFy] = useState(910)
  const [cx, setCx] = useState(WIDTH / 2)
  const [cy, setCy] = useState(HEIGHT / 2)
  const [camHeight, setCamHeight] = useState(2.0)

  useEffect(() => {
    if (data) return

    const loadLogs = async () => {
      await db.init()
      const workers: Worker[] = []

      for (let i = 0; i < logs.length; i++) {
        const url = logs[i]
        const cacheKey = `${routeName}--${i}--raw`
        const cached = await db.get<string>(cacheKey)

        if (cached) {
          setData((prev) => ({ ...prev, ...JSON.parse(cached) }))
          continue
        }

        const worker = new Worker()
        workers.push(worker)

        worker.onmessage = async (e) => {
          const { frames, calibration, initData, error } = e.data
          if (frames) {
            setData((prev) => ({ ...prev, ...frames }))
            await db.set(cacheKey, JSON.stringify(frames))
          }

          if (calibration) {
            if (calibration.height?.[0]) setCamHeight(calibration.height[0])
            // We could also use rpy here if we implemented full rotation
          }

          if (initData) {
            // TICI (Comma 3) has DeviceType 3
            if (initData.deviceType === 3) {
              setFx(2648)
              setFy(2648)
            }
          }

          if (error) console.error('Worker error:', error)
          worker.terminate()
        }

        worker.postMessage({ url })
      }
    }

    loadLogs()
  }, [logs, routeName])

  const d = data?.[frame.toFixed(0)]

  const projectedPaths = useMemo(() => {
    if (!d) return null

    const project = (x: number, y: number, z: number) => {
      const Xc = y
      const Yc = -(z - camHeight)
      const Zc = x

      if (Zc < 0.5) return null

      const u = fx * (Xc / Zc) + cx
      const v = fy * (Yc / Zc) + cy

      return { x: u, y: v }
    }

    const getPolyline = (X: number[], Y: number[], Z: number[]) => {
      const points: { x: number; y: number }[] = []
      for (let i = 0; i < X.length; i++) {
        const p = project(X[i], Y[i], Z[i])
        if (p) points.push(p)
      }
      if (points.length === 0) return null
      return `M ${points[0].x.toFixed(0)} ${points[0].y.toFixed(0)} ${points
        .slice(1)
        .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
        .join(' ')}`
    }

    // Driving Path
    let pathData = ''
    const { X, Y, Z } = d.position
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

    if (leftPoints.length > 0) {
      pathData = `M ${leftPoints[0].x.toFixed(0)} ${leftPoints[0].y.toFixed(0)} ${leftPoints
        .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
        .join(' ')} ${rightPoints
        .reverse()
        .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
        .join(' ')} Z`
    }

    // Lane Lines
    const laneLines = d.laneLines.map((line) => ({
      d: getPolyline(line.X, line.Y, line.Z),
      prob: line.prob,
    }))

    // Road Edges
    const roadEdges = d.roadEdges.map((edge) => getPolyline(edge.X, edge.Y, edge.Z))

    return { path: pathData, laneLines, roadEdges }
  }, [d, fx, fy, cx, cy, camHeight])

  return (
    <AbsoluteFill>
      {projectedPaths ? (
        <svg width={WIDTH} height={HEIGHT} style={{ overflow: 'visible' }}>
          {projectedPaths.path && <path d={projectedPaths.path} fill="rgba(0, 255, 0, 0.4)" stroke="none" />}
          {projectedPaths.laneLines.map((line, i) =>
            line.d ? (
              <path key={`lane-${i}`} d={line.d} stroke="white" strokeWidth={4} fill="none" style={{ opacity: Math.max(0.1, line.prob) }} />
            ) : null,
          )}
          {projectedPaths.roadEdges.map((edge, i) =>
            edge ? <path key={`edge-${i}`} d={edge} stroke="red" strokeWidth={4} fill="none" /> : null,
          )}
        </svg>
      ) : (
        <div></div>
      )}

      {/* Calibration Controls */}
      <div className="absolute top-4 right-4 bg-black/80 p-4 rounded-lg text-white text-xs flex flex-col gap-2 w-64 z-50">
        <h3 className="font-bold mb-2">Calibration</h3>
        <label className="flex flex-col">
          FX: {fx}
          <input type="range" min="500" max="2000" value={fx} onChange={(e) => setFx(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          FY: {fy}
          <input type="range" min="500" max="2000" value={fy} onChange={(e) => setFy(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          CX: {cx}
          <input type="range" min="0" max={WIDTH} value={cx} onChange={(e) => setCx(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          CY: {cy}
          <input type="range" min="0" max={HEIGHT} value={cy} onChange={(e) => setCy(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          Height: {camHeight.toFixed(2)}
          <input type="range" min="0.5" max="3.0" step="0.1" value={camHeight} onChange={(e) => setCamHeight(Number(e.target.value))} />
        </label>
      </div>
    </AbsoluteFill>
  )
}
