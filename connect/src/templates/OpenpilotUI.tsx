import { AbsoluteFill, staticFile, useCurrentFrame, useDelayRender } from 'remotion'
import { WIDTH, HEIGHT, FPS } from './shared'
import { useMemo, useState } from 'react'
import { DB } from '../utils/db'
import { DriverStateRenderer } from './DriverStateRenderer'
import type { FrameData } from '../../../shared/log-reader/reader'
import { useAsyncEffect } from '../utils/hooks'
import { LogType, UnitFormat } from '../../../shared/types'
import { MI_TO_KM } from '../utils/format'

const PATH_WIDTH = 0.8
const FCAM_F = 2648.0
const CX = WIDTH / 2
const CY = HEIGHT / 1.85
const CAM_HEIGHT = 1.1

type LogData = {
  frames: Record<number, FrameData>
}

export const OpenpilotUI = ({
  url,
  routeName,
  i,
  showPath,
  unitFormat,
}: {
  i: number
  url: string
  routeName: string
  showPath: boolean
  unitFormat?: UnitFormat
}) => {
  const _frame = useCurrentFrame()
  const [logData, setLogData] = useState<LogData>()
  const logType: LogType = url.includes('qlog') ? 'qlogs' : 'logs'
  const { continueRender, delayRender, cancelRender } = useDelayRender()

  useAsyncEffect(async () => {
    const handle = delayRender('Logs')
    setLogData(undefined)
    const db = await DB.init('logs')

    const cacheKey = `${routeName}--${i}--${logType}--v3`
    const cached = await db.get<string>(cacheKey)

    if (cached) {
      continueRender(handle)
      return setLogData(JSON.parse(cached))
    }

    const Worker = await import('../../../shared/log-reader/worker?worker').then((x) => x.default)
    const worker = new Worker()

    worker.onmessage = async ({ data }) => {
      if (data.error) {
        cancelRender(data.error)
        console.error('Worker error:', data.error)
        worker.terminate()
        return
      }

      const result: LogData = { frames: data.frames }
      setLogData(result)
      await db.set(cacheKey, JSON.stringify(result))
      continueRender(handle)
      worker.terminate()
    }

    worker.postMessage({ url, logType })
  }, [url, routeName])

  // Pre-compute sorted time offsets for binary search
  const sortedTimeOffsets = useMemo(() => {
    if (!logData?.frames) return []
    return Object.keys(logData.frames)
      .map(Number)
      .sort((a, b) => a - b)
  }, [logData])

  // Convert Remotion frame to milliseconds from video start
  // _frame is 0-indexed within this segment, FPS is 20
  const targetTimeMs = Math.floor((_frame * 1000) / FPS)

  // Binary search for the largest time offset <= targetTimeMs
  const frame = useMemo(() => {
    if (sortedTimeOffsets.length === 0 || !logData?.frames) return undefined

    // Binary search for the rightmost offset <= targetTimeMs
    let left = 0
    let right = sortedTimeOffsets.length - 1
    let result = -1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (sortedTimeOffsets[mid] <= targetTimeMs) {
        result = mid
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    // No frame before target time
    if (result === -1) {
      // For segments after the first, use first available frame to avoid flicker
      // For segment 0, return undefined (model is still warming up)
      return i > 0 ? logData.frames[sortedTimeOffsets[0]] : undefined
    }

    // Check if frame is within 2s of target
    const frameTimeMs = sortedTimeOffsets[result]
    if (targetTimeMs - frameTimeMs > 2000) return undefined

    return logData.frames[frameTimeMs]
  }, [sortedTimeOffsets, targetTimeMs, logData])

  if (!frame) return null

  const speedMultiplier = 2.23694 * (unitFormat === 'imperial' ? 1 : MI_TO_KM)
  return (
    <AbsoluteFill>
      {frame.CarState?.CruiseEnabled && <div className="absolute -inset-[30px] border-[60px] border-[#00c853] z-10 pointer-events-none rounded-[80px]" />}

      {frame.CarState && (
        <>
          <div className="absolute top-12 left-12 bg-[#1e1e1e] border border-white/20 rounded-[32px] w-56 h-56 flex flex-col items-center justify-center z-20">
            <div className="text-[#00c853] text-4xl font-bold mb-2">MAX</div>
            <div className="text-white text-[100px] leading-none font-bold">
              {frame.CarState.CruiseEnabled ? (frame.CarState.CruiseSpeed * speedMultiplier).toFixed(0) : '-'}
            </div>
          </div>

          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
            <div className="text-white text-[220px] leading-none font-bold drop-shadow-lg">{Math.max(0, frame.CarState.VEgo * speedMultiplier).toFixed(0)}</div>
            <div className="text-white/80 text-[60px] font-medium mt-4 leading-none">{unitFormat === 'imperial' ? 'mph' : 'kmh'}</div>
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

    // Get calibration (roll, pitch, yaw) - defaults to 0 if not available
    // RpyCalib represents rotation FROM device frame TO calibrated/road frame
    // Model outputs are in calibrated frame, so we apply INVERSE to get to device frame
    const [roll, pitch, yaw] = frame.LiveCalibration?.RpyCalib ?? [0, 0, 0]

    // Build rotation matrix for calibrated -> device frame (inverse of device -> calibrated)
    // Using negative angles for inverse rotation
    const cr = Math.cos(-roll),
      sr = Math.sin(-roll)
    const cp = Math.cos(-pitch),
      sp = Math.sin(-pitch)
    const cy = Math.cos(-yaw),
      sy = Math.sin(-yaw)

    // Project 3D car-space point to 2D screen coordinates with calibration
    // Car space: X = forward, Y = left (positive = left), Z = up
    const project = (x: number, y: number, z: number) => {
      if (x < 1.0) return null

      // Apply inverse calibration: calibrated frame -> device frame
      // Rotation order: Rx(roll) * Ry(pitch) * Rz(yaw) with negated angles
      // Step 1: Rz(-yaw)
      const x1 = x * cy + y * sy
      const y1 = -x * sy + y * cy
      const z1 = z

      // Step 2: Ry(-pitch)
      const x2 = x1 * cp - z1 * sp
      const y2 = y1
      const z2 = x1 * sp + z1 * cp

      // Step 3: Rx(-roll)
      const x3 = x2
      const y3 = y2 * cr + z2 * sr
      const z3 = -y2 * sr + z2 * cr

      if (x3 < 1.0) return null

      // Camera pinhole projection (device frame to image)
      const screenX = CX + (FCAM_F * y3) / x3
      const screenY = CY + (FCAM_F * (CAM_HEIGHT - z3)) / x3

      if (screenX < -500 || screenX > WIDTH + 500 || screenY < -500 || screenY > HEIGHT + 500) return null

      return { x: screenX, y: screenY }
    }

    const getPolyline = (X: number[], Y: number[], Z: number[], forceGroundLevel = false) => {
      const points: { x: number; y: number }[] = []
      for (let i = 0; i < X.length; i++) {
        const p = project(X[i], Y[i], forceGroundLevel ? 0 : Z[i])
        if (p) points.push(p)
      }
      if (points.length === 0) return null
      return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ${points
        .slice(1)
        .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ')}`
    }

    // Driving Path - create a polygon with left and right edges
    const { X, Y, Z } = frame.ModelV2.Position
    const leftPoints: { x: number; y: number }[] = []
    const rightPoints: { x: number; y: number }[] = []

    for (let i = 0; i < X.length; i++) {
      // Dampen Z at distance to bring far end of path lower
      const zDampen = Math.max(0, 1 - X[i] / 150)
      const z = Z[i] * zDampen
      const l = project(X[i], Y[i] - PATH_WIDTH, z)
      const r = project(X[i], Y[i] + PATH_WIDTH, z)

      if (l && r) {
        leftPoints.push(l)
        rightPoints.push(r)
      }
    }

    const path =
      leftPoints.length > 0
        ? `M ${leftPoints[0].x.toFixed(1)} ${leftPoints[0].y.toFixed(1)} ${leftPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} ${rightPoints
            .reverse()
            .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(' ')} Z`
        : undefined

    const showLaneLines = frame.ModelV2.LaneLines.some((x) => x.prob && x.prob > 0.1)
    const laneLines = showLaneLines ? frame.ModelV2.LaneLines.map((line) => ({ d: getPolyline(line.X, line.Y, line.Z, true), prob: line.prob })) : undefined

    const roadEdges = showLaneLines ? frame.ModelV2.RoadEdges.map((edge) => getPolyline(edge.X, edge.Y, edge.Z, true)) : undefined

    return { path, laneLines, roadEdges }
  }, [frame])

  if (!paths) return null

  return (
    <svg width={WIDTH} height={HEIGHT} style={{ overflow: 'visible', opacity: 0.4 }}>
      {paths.path && <path d={paths.path} fill="rgba(0, 255, 0)" stroke="none" />}
      {paths.laneLines?.map(
        (line, i) =>
          line.d && <path key={`lane-${i}`} d={line.d} stroke="white" strokeWidth={4} fill="none" style={{ opacity: Math.max(0.1, line.prob ?? 0) }} />,
      )}
      {paths.roadEdges?.map((edge, i) => edge && <path key={`edge-${i}`} d={edge} stroke="red" strokeWidth={4} fill="none" />)}
    </svg>
  )
}
