import { LogReader } from './index'

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
    const frames: Record<string, any> = {}
    let latestCarState: any = null

    for await (const event of reader) {
      if ('LiveCalibration' in event) {
        console.log(event.LiveCalibration)
      }

      if ('CarState' in event) {
        const cs = event.CarState
        latestCarState = {
          vEgo: cs.VEgo,
          engaged: cs.CruiseState.Enabled,
          maxSpeed: cs.CruiseState.Speed,
        }
      }

      if ('ModelV2' in event) {
        const model = event.ModelV2
        const { X, Y, Z } = model.Position

        // Lane Lines
        const laneLines = []
        if (model.LaneLines) {
          for (let i = 0; i < model.LaneLines.length; i++) {
            const line = model.LaneLines[i]
            laneLines.push({ X: line.X, Y: line.Y, Z: line.Z, prob: model.LaneLineProbs?.[i] ?? 0 })
          }
        }

        // Road Edges
        const roadEdges = []
        if (model.RoadEdges) {
          for (const edge of model.RoadEdges) roadEdges.push({ X: edge.X, Y: edge.Y, Z: edge.Z })
        }

        frames[model.FrameId.toFixed(0)] = {
          position: { X, Y, Z },
          laneLines,
          roadEdges,
          carState: latestCarState,
        }
      }
    }

    self.postMessage({ frames })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
