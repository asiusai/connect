import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { WIDTH, HEIGHT } from './shared'
import { useEffect, useMemo, useState } from 'react'
import { Files } from '../src/types'
import Worker from '../log-reader/worker?worker'
import { DB } from '../src/utils/db'

const db = new DB()

export type FrameData = {
  position: { X: number[]; Y: number[]; Z: number[] }
  laneLines: { X: number[]; Y: number[]; Z: number[]; prob?: number }[]
  roadEdges: { X: number[]; Y: number[]; Z: number[] }[]
  carState?: { VEgo: number; engaged: boolean; maxSpeed: number }
}

const PATH_WIDTH = 1.8
const FX = 500
const FY = 2000
const CX = 857
const CY = 626
const CAM_HEIGHT = 1.5

export const DrivingPath = ({ files, routeName }: { files: Files; routeName: string }) => {
  const frame = useCurrentFrame()
  const [data, setData] = useState<Record<string, FrameData>>()
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

        worker.onmessage = async ({ data }) => {
          if (data.error) {
            console.error('Worker error:', data.error)
          }

          if (data.frames) {
            setData((prev) => ({ ...prev, ...data.frames }))
            await db.set(cacheKey, JSON.stringify(data.frames))
          }

          worker.terminate()
        }

        worker.postMessage({ url })
      }
    }

    loadLogs()
  }, [...logs, routeName])

  const item = data?.[frame]

  const projectedPaths = useMemo(() => {
    if (!item) return null

    const project = (x: number, y: number, z: number) => {
      const Xc = y
      const Yc = -(z - CAM_HEIGHT)
      const Zc = x

      if (Zc < 0.5) return null

      return {
        x: FX * (Xc / Zc) + CX,
        y: FY * (Yc / Zc) + CY,
      }
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
    const { X, Y, Z } = item.position
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

    const path =
      leftPoints.length > 0
        ? `M ${leftPoints[0].x.toFixed(0)} ${leftPoints[0].y.toFixed(0)} ${leftPoints
            .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
            .join(' ')} ${rightPoints
            .reverse()
            .map((p) => `L ${p.x.toFixed(0)} ${p.y.toFixed(0)}`)
            .join(' ')} Z`
        : undefined

    const showLaneLines = item.laneLines.some((x) => x.prob && x.prob > 0.1)
    const laneLines = showLaneLines
      ? item.laneLines.map((line) => ({ d: getPolyline(line.X, line.Y, line.Z), prob: line.prob }))
      : undefined

    const roadEdges = showLaneLines ? item.roadEdges.map((edge) => getPolyline(edge.X, edge.Y, edge.Z)) : undefined

    return { path, laneLines, roadEdges }
  }, [item, FX, FY, CX, CY, CAM_HEIGHT])

  return (
    <AbsoluteFill>
      {item?.carState?.engaged && (
        <div className="absolute inset-0 border-[30px] border-[#00c853] z-10 pointer-events-none rounded-[40px]" />
      )}

      {item?.carState && (
        <>
          <div className="absolute top-12 left-12 bg-[#1e1e1e] border border-white/20 rounded-[32px] w-56 h-56 flex flex-col items-center justify-center z-20">
            <div className="text-[#00c853] text-2xl font-bold mb-2">MAX</div>
            <div className="text-white text-[100px] leading-none font-bold">
              {item.carState.engaged ? (item.carState.maxSpeed * 2.23694).toFixed(0) : '-'}
            </div>
          </div>

          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
            <div className="text-white text-[220px] leading-none font-bold drop-shadow-lg">
              {Math.max(0, item.carState.VEgo * 2.23694).toFixed(0)}
            </div>
            <div className="text-white/80 text-[60px] font-medium mt-4 leading-none">mph</div>
          </div>
        </>
      )}

      {projectedPaths && (
        <svg width={WIDTH} height={HEIGHT} style={{ overflow: 'visible' }}>
          {projectedPaths.path && <path d={projectedPaths.path} fill="rgba(0, 255, 0, 0.4)" stroke="none" />}
          {projectedPaths.laneLines?.map(
            (line, i) =>
              line.d && (
                <path
                  key={`lane-${i}`}
                  d={line.d}
                  stroke="white"
                  strokeWidth={4}
                  fill="none"
                  style={{ opacity: Math.max(0.1, line.prob ?? 0) }}
                />
              ),
          )}
          {projectedPaths.roadEdges?.map((edge, i) => edge && <path key={`edge-${i}`} d={edge} stroke="red" strokeWidth={4} fill="none" />)}
        </svg>
      )}
    </AbsoluteFill>
  )
}
