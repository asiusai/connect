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
export type LiveCalibration = {
  RpyCalib: number[] // [roll, pitch, yaw] in radians
}
export type FrameData = {
  event: 'ModelV2' | 'DrivingModelData'
  ModelV2?: ModelV2
  CarState?: CarState
  DriverStateV2?: DriverStateV2
  SelfdriveState?: SelfdriveState
  LiveCalibration?: LiveCalibration
}

// Frames are keyed by time offset in milliseconds from video start
export type ReadLogsResult = {
  frames: Record<number, FrameData>
}

export type ReadLogsInput = {
  url: string
}

export const readLogs = async ({ url }: ReadLogsInput): Promise<ReadLogsResult> => {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error('Failed to fetch log file!')

  const reader = LogReader(res.body)

  // Frames keyed by time offset in ms from video start
  const DrivingModelData: Record<number, FrameData> = {}
  const ModelV2: Record<number, FrameData> = {}

  let CarState: CarState | undefined
  let DriverStateV2: DriverStateV2 | undefined
  let SelfdriveState: SelfdriveState | undefined
  let LiveCalibration: LiveCalibration | undefined

  // Track video start time from first RoadCameraState
  let videoStartTimeNs: bigint | undefined

  for await (const event of reader) {
    // Track video start time from first RoadCameraState.TimestampEof
    if ('RoadCameraState' in event && videoStartTimeNs === undefined) {
      videoStartTimeNs = BigInt(event.RoadCameraState.TimestampEof)
    }

    if ('LiveCalibration' in event) {
      const rpyCalib = event.LiveCalibration.RpyCalib
      if (rpyCalib && rpyCalib.length >= 3) {
        LiveCalibration = { RpyCalib: [rpyCalib[0], rpyCalib[1], rpyCalib[2]] }
      }
    }

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
      const { FaceOrientation, FacePosition, FaceProb, LeftEyeProb, RightEyeProb, LeftBlinkProb, RightBlinkProb } = event.DriverStateV2.LeftDriverData
      DriverStateV2 = { FaceOrientation, FacePosition, FaceProb, LeftEyeProb, RightEyeProb, LeftBlinkProb, RightBlinkProb }
    }

    if ('DrivingModelData' in event && videoStartTimeNs !== undefined) {
      const logTimeNs = BigInt(event.LogMonoTime)
      const offsetMs = Number((logTimeNs - videoStartTimeNs) / 1_000_000n)

      // Only include frames after video start (offset >= 0)
      if (offsetMs >= 0) {
        DrivingModelData[offsetMs] = {
          event: 'DrivingModelData',
          CarState,
          DriverStateV2,
          SelfdriveState,
        }
      }
    }

    if ('ModelV2' in event && videoStartTimeNs !== undefined) {
      const { Position, LaneLines, RoadEdges, LaneLineProbs } = event.ModelV2
      const logTimeNs = BigInt(event.LogMonoTime)
      const offsetMs = Number((logTimeNs - videoStartTimeNs) / 1_000_000n)

      // Only include frames after video start (offset >= 0)
      if (offsetMs >= 0) {
        ModelV2[offsetMs] = {
          event: 'ModelV2',
          ModelV2: {
            Position: { X: Position.X, Y: Position.Y, Z: Position.Z },
            LaneLines: LaneLines?.map(({ X, Y, Z }: any, i: number) => ({ X, Y, Z, prob: LaneLineProbs?.[i] })),
            RoadEdges: RoadEdges?.map(({ X, Y, Z }: any) => ({ X, Y, Z })),
          },
          CarState,
          DriverStateV2,
          SelfdriveState,
          LiveCalibration,
        }
      }
    }
  }

  const frames = Object.keys(ModelV2).length ? ModelV2 : DrivingModelData
  return { frames }
}
