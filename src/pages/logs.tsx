import { useState } from 'react'
import { LogReader } from '../../log-reader'
import { useFiles } from '../api/queries'
import { useAsyncEffect, useParams } from '../utils/hooks'
import { TopAppBar } from '../components/material/TopAppBar'
import { IconButton } from '../components/material/IconButton'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

const LogEvent = z.enum([
  'Sentinel',
  'AndroidLog',
  'Can',
  'DeviceState',
  'ErrorLogMessage',
  'LogMessage',
  'ManagerState',
  'PandaStates',
  'PeripheralState',
  'ProcLog',
  'UiDebug',
  'Accelerometer',
  'Gyroscope',
  'Magnetometer',
  'TemperatureSensor',
  'Clocks',
  'SoundPressure',
  'DriverCameraState',
  'WideRoadCameraState',
  'RoadCameraState',
  'DriverEncodeIdx',
  'RoadEncodeIdx',
  'WideRoadEncodeIdx',
  'QcomGnss',
  'CarOutput',
  'CarParams',
  'CarState',
  'SelfdriveState',
  'LiveCalibration',
  'OnroadEvents',
  'LiveTracks',
  'CarControl',
  'ControlsState',
  'LiveTorqueParameters',
  'LiveDelay',
  'RadarState',
  'ModelV2',
  'CameraOdometry',
  'DrivingModelData',
  'LivePose',
  'LongitudinalPlan',
  'DriverAssistance',
  'LiveParameters',
  'DriverStateV2',
  'DriverMonitoringState',
  'Sendcan',
  'Thumbnail',
  'GpsLocation',
])
type LogEvent = z.infer<typeof LogEvent>

const LIMIT = 10
export const Component = () => {
  const { routeName, dongleId, date } = useParams()
  const [params] = useSearchParams()
  const [segment, setSegment] = useState(Number(params.get('segment')) || 0)
  const [eventName, setEventName] = useState<LogEvent>('DrivingModelData')
  const [data, setData] = useState<string[]>()
  const [files] = useFiles(routeName)
  const url = files?.logs[segment]

  useAsyncEffect(async () => {
    if (!url) return

    const res = await fetch(url)
    if (!res.ok || !res.body) return

    const reader = LogReader(res.body)
    if (!reader) return

    let count = 0
    const data = []
    for await (const event of reader) {
      if (!(eventName in event)) continue
      if (count >= LIMIT) break

      data.push(JSON.stringify(event[eventName]))

      count++
    }
    setData(data)
  }, [url, eventName, segment])
  return (
    <>
      <TopAppBar leading={<IconButton name="keyboard_arrow_left" href={`/${dongleId}/routes/${date}`} />}>Logs</TopAppBar>
      <select value={segment} onChange={(e) => setSegment(Number(e.currentTarget.value))}>
        {files && Array.from({ length: files.logs.length }).map((_, i) => <option key={i}>{i}</option>)}
      </select>
      <select value={eventName} onChange={(e) => setEventName(e.currentTarget.value as any)}>
        {LogEvent.options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      <div className="text-sm">
        {data?.map((x, i) => (
          <div key={i}>{x}</div>
        ))}
      </div>
    </>
  )
}
