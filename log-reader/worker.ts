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
    let calibration: any = null
    let initData: any = null

    for await (const event of reader) {
      if ('InitData' in event) {
        const init = event.InitData
        initData = {
          deviceType: init.DeviceType,
        }
      }

      if ('LiveCalibration' in event) {
        const cal = event.LiveCalibration
        if (cal.Height && cal.RpyCalib) {
          calibration = {
            height: cal.Height[0],
            rpy: cal.RpyCalib,
          }
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
          for (const edge of model.RoadEdges) {
            roadEdges.push({ X: edge.X, Y: edge.Y, Z: edge.Z })
          }
        }

        frames[model.FrameId.toFixed(0)] = {
          position: { X, Y, Z },
          laneLines,
          roadEdges,
        }
      }
    }

    self.postMessage({ frames, calibration, initData })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
}
