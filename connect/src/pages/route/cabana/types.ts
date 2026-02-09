export type CanFrame = {
  address: number
  data: Uint8Array
  src: number
  timestamp: number // ms from route start
}

export type CanMessage = {
  key: string // `${address}-${src}` for uniqueness
  address: number
  src: number
  count: number
  frequency: number // Hz
  lastData: Uint8Array
  recentFrames: CanFrame[] // frames around current time for history
  bitChanges: number[] // count of changes per bit (up to 64 values)
}

export type DecodedSignal = {
  name: string
  value: number
  unit: string
  min: number
  max: number
  formattedValue: string
}

// All frames for a message, indexed for quick time-based lookup
export type MessageFrames = {
  key: string
  address: number
  src: number
  frames: CanFrame[] // sorted by timestamp
  bitChanges: number[] // accumulated changes
  frequency: number
}
