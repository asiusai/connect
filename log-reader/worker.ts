import { FrameData } from '../templates/DrivingPath'
import { LogReader } from './index'

export type Pos = { X: number[]; Y: number[]; Z: number[]; prob?: number }

self.onmessage = async ({ data: { url } }: any) => {
  if (!url) return

  try {
    const res = await fetch(url)
    if (!res.ok || !res.body) {
      self.postMessage({ error: 'Failed to fetch log' })
      return
    }

    const reader = LogReader(res.body)
    const frames: Record<string, FrameData> = {}
    let carState: any = null
    let driverState: any = null

    for await (const event of reader) {
      // if ('LiveCalibration' in event) console.log(event.LiveCalibration)

      if ('CarState' in event) {
        const { VEgo, CruiseState, GearShifter, LeftBlinker, RightBlinker } = event.CarState
        carState = {
          VEgo,
          GearShifter,
          LeftBlinker,
          RightBlinker,
          engaged: CruiseState.Enabled,
          maxSpeed: CruiseState.Speed,
          experimentalMode: false,
        }
      }

      if ('SelfdriveState' in event) {
        carState = { ...carState, experimentalMode: event.SelfdriveState.ExperimentalMode }
      }

      if ('ModelV2' in event) {
        const { Position, LaneLines, RoadEdges, LaneLineProbs, FrameId } = event.ModelV2

        const laneLines: Pos[] = LaneLines?.map(({ X, Y, Z }: any, i: number) => ({ X, Y, Z, prob: LaneLineProbs?.[i] })) || []
        const roadEdges: Pos[] = RoadEdges?.map(({ X, Y, Z }: any) => ({ X, Y, Z })) || []

        frames[FrameId] = {
          position: { X: Position.X, Y: Position.Y, Z: Position.Z },
          laneLines,
          roadEdges,
          carState,
          ...(driverState ? { driverState } : {}),
        }
      }

      if ('DriverStateV2' in event) {
        const { LeftDriverData } = event.DriverStateV2
        const { FaceOrientation, FacePosition, FaceProb, LeftEyeProb, RightEyeProb, LeftBlinkProb, RightBlinkProb } = LeftDriverData
        driverState = {
          faceOrientation: Array.from(FaceOrientation),
          facePosition: Array.from(FacePosition),
          faceProb: FaceProb,
          leftEyeProb: LeftEyeProb,
          rightEyeProb: RightEyeProb,
          leftBlinkProb: LeftBlinkProb,
          rightBlinkProb: RightBlinkProb,
        }
      }
    }

    self.postMessage({ frames })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
