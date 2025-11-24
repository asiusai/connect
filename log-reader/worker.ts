import { LogReader } from './index'

export type Pos = { X: number[]; Y: number[]; Z: number[]; prob?: number }

export type DrivingModelData = {
  Path: {
    XCoefficients: number[]
    YCoefficients: number[]
    ZCoefficients: number[]
  }
  LaneLineMeta: {
    LeftY: number
    RightY: number
    LeftProb: number
    RightProb: number
  }
}

export type ModelV2 = {
  Position: Pos
  LaneLines: Pos[]
  RoadEdges: Pos[]
}

export type DriverStateV2 = {
  FaceOrientation: number[]
  FacePosition: number[]
  FaceProb: number
  LeftEyeProb: number
  RightEyeProb: number
  LeftBlinkProb: number
  RightBlinkProb: number
}
export type CarState = {
  VEgo: number
  CruiseEnabled: boolean
  CruiseSpeed: number
  GearShifter: number
  LeftBlinker: boolean
  RightBlinker: boolean
}
export type SelfdriveState = {
  ExperimentalMode: boolean
}
export type FrameData = {
  event: 'ModelV2' | 'DrivingModelData'
  ModelV2?: ModelV2
  CarState?: CarState
  DriverStateV2?: DriverStateV2
  SelfdriveState?: SelfdriveState
}
export type WorkerData = {
  url: string
  logType: 'log' | 'qlog'
}

self.onmessage = async ({ data: { url, logType } }: { data: WorkerData }) => {
  if (!url) return

  try {
    const res = await fetch(url)
    if (!res.ok || !res.body) {
      self.postMessage({ error: 'Failed to fetch log' })
      return
    }

    const reader = LogReader(res.body)
    const frames: Record<string, FrameData> = {}
    let CarState: CarState | undefined
    let DriverStateV2: DriverStateV2 | undefined
    let SelfdriveState: SelfdriveState | undefined

    for await (const event of reader) {
      if ('CarState' in event) {
        const { VEgo, CruiseState, GearShifter, LeftBlinker, RightBlinker } = event.CarState
        CarState = {
          VEgo,
          GearShifter,
          LeftBlinker,
          RightBlinker,
          CruiseEnabled: CruiseState.Enabled,
          CruiseSpeed: CruiseState.Speed,
        }
      }

      if ('SelfdriveState' in event) {
        SelfdriveState = { ExperimentalMode: event.SelfdriveState.ExperimentalMode }
      }

      if ('DriverStateV2' in event) {
        const { FaceOrientation, FacePosition, FaceProb, LeftEyeProb, RightEyeProb, LeftBlinkProb, RightBlinkProb } =
          event.DriverStateV2.LeftDriverData
        DriverStateV2 = { FaceOrientation, FacePosition, FaceProb, LeftEyeProb, RightEyeProb, LeftBlinkProb, RightBlinkProb }
      }

      if (logType === 'qlog' && 'DrivingModelData' in event) {
        const { FrameId } = event.DrivingModelData

        frames[FrameId] = {
          event: 'DrivingModelData',
          CarState,
          DriverStateV2,
          SelfdriveState,
        }
      }

      if (logType === 'log' && 'ModelV2' in event) {
        const { Position, LaneLines, RoadEdges, LaneLineProbs, FrameId } = event.ModelV2

        frames[FrameId] = {
          event: 'ModelV2',
          ModelV2: {
            Position: { X: Position.X, Y: Position.Y, Z: Position.Z },
            LaneLines: LaneLines?.map(({ X, Y, Z }: any, i: number) => ({ X, Y, Z, prob: LaneLineProbs?.[i] })),
            RoadEdges: RoadEdges?.map(({ X, Y, Z }: any) => ({ X, Y, Z })),
          },
          CarState,
          DriverStateV2,
          SelfdriveState,
        }
      }
    }

    self.postMessage({ frames })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
