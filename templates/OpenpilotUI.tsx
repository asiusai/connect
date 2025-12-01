import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion'
import { WIDTH, HEIGHT, FPS } from './shared'
import { useMemo, useState } from 'react'
import { DB } from '../src/utils/db'
import { DriverStateRenderer } from './DriverStateRenderer'
import type { FrameData } from '../log-reader/reader'
import { useAsyncEffect } from '../src/utils/hooks'
import { LogType } from '../src/types'

const db = new DB()

const PATH_WIDTH = 1.8
const FX = 500
const FY = 2000
const CX = 857
const CY = 626
const CAM_HEIGHT = 1.5

export const OpenpilotUI = ({
  url,
  routeName,
  i,
  prefetchedFrames,
  showPath,
}: {
  i: number
  url: string
  routeName: string
  prefetchedFrames?: Record<string, FrameData>
  showPath: boolean
}) => {
  const _frame = useCurrentFrame()
  const [frames, setFrames] = useState<Record<string, FrameData> | undefined>(prefetchedFrames)
  const logType: LogType = url.includes('qlog') ? 'qlogs' : 'logs'
  useAsyncEffect(async () => {
    if (frames) return

    await db.init()
    const workers: Worker[] = []

    const cacheKey = `${routeName}--${i}--${logType}`
    const cached = await db.get<string>(cacheKey)

    if (cached) return setFrames((prev) => ({ ...prev, ...JSON.parse(cached) }))

    const Worker = await import('../log-reader/worker?worker').then((x) => x.default)
    const worker = new Worker()
    workers.push(worker)

    worker.onmessage = async ({ data }) => {
      if (data.error) {
        console.error('Worker error:', data.error)
      }

      if (data.frames) {
        setFrames((prev) => ({ ...prev, ...data.frames }))
        await db.set(cacheKey, JSON.stringify(data.frames))
      }

      worker.terminate()
    }

    worker.postMessage({ url, logType })
  }, [url, routeName])

  // Finding the latest frame data, max 2s old
  const currentFrame = i * 60 * FPS + _frame
  let frame: FrameData | undefined
  for (let i = 0; i < FPS * 2; i++) {
    const res = frames?.[currentFrame - i]
    if (res) {
      frame = res
      break
    }
  }
  if (!frame) return null

  return (
    <AbsoluteFill>
      {frame.CarState?.CruiseEnabled && (
        <div className="absolute -inset-[30px] border-[60px] border-[#00c853] z-10 pointer-events-none rounded-[80px]" />
      )}

      {frame.CarState && (
        <>
          <div className="absolute top-12 left-12 bg-[#1e1e1e] border border-white/20 rounded-[32px] w-56 h-56 flex flex-col items-center justify-center z-20">
            <div className="text-[#00c853] text-4xl font-bold mb-2">MAX</div>
            <div className="text-white text-[100px] leading-none font-bold">
              {frame.CarState.CruiseEnabled ? (frame.CarState.CruiseSpeed * 2.23694).toFixed(0) : '-'}
            </div>
          </div>

          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
            <div className="text-white text-[220px] leading-none font-bold drop-shadow-lg">
              {Math.max(0, frame.CarState.VEgo * 2.23694).toFixed(0)}
            </div>
            <div className="text-white/80 text-[60px] font-medium mt-4 leading-none">mph</div>
          </div>

          <div className="absolute top-12 right-12 z-20">
            <img
              src={frame.SelfdriveState?.ExperimentalMode ? staticFile('/experimental.png') : staticFile('/chffr_wheel.png')}
              className="w-40 h-40 object-contain opacity-80"
              alt="Mode Icon"
            />
          </div>
        </>
      )}

      {frame.DriverStateV2 && (
        <div className="absolute bottom-12 left-12 z-20">
          <DriverStateRenderer state={frame.DriverStateV2} isEngaged={frame.CarState?.CruiseEnabled ?? false} />
        </div>
      )}
      {showPath && <Path frame={frame} />}
    </AbsoluteFill>
  )
}

const Path = ({ frame }: { frame: FrameData }) => {
  const paths = useMemo(() => {
    if (!frame?.ModelV2) return null

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
    const { X, Y, Z } = frame.ModelV2.Position
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

    const showLaneLines = frame.ModelV2.LaneLines.some((x) => x.prob && x.prob > 0.1)
    const laneLines = showLaneLines
      ? frame.ModelV2.LaneLines.map((line) => ({ d: getPolyline(line.X, line.Y, line.Z), prob: line.prob }))
      : undefined

    const roadEdges = showLaneLines ? frame.ModelV2.RoadEdges.map((edge) => getPolyline(edge.X, edge.Y, edge.Z)) : undefined

    return { path, laneLines, roadEdges }
  }, [frame, FX, FY, CX, CY, CAM_HEIGHT])

  if (!paths) return null

  return (
    <svg width={WIDTH} height={HEIGHT} style={{ overflow: 'visible' }}>
      {paths.path && <path d={paths.path} fill="rgba(0, 255, 0, 0.4)" stroke="none" />}
      {paths.laneLines?.map(
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
      {paths.roadEdges?.map((edge, i) => edge && <path key={`edge-${i}`} d={edge} stroke="red" strokeWidth={4} fill="none" />)}
    </svg>
  )
}
