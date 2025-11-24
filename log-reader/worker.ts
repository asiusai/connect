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

    for await (const event of reader) {
      // if ('LiveCalibration' in event) console.log(event.LiveCalibration)

      if ('CarState' in event) {
        const { VEgo, CruiseState, GearShifter, LeftBlinker, RightBlinker } = event.CarState
        carState = { VEgo, GearShifter, LeftBlinker, RightBlinker, engaged: CruiseState.Enabled, maxSpeed: CruiseState.Speed }
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
        }
      }
    }

    self.postMessage({ frames })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
