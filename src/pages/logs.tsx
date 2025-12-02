import { useState } from 'react'
import { LogReader } from '../../log-reader'
import { useFiles } from '../api/queries'
import { useAsyncEffect, useParams } from '../utils/hooks'
import { Icon } from '../components/Icon'
import { TopAppBar } from '../components/TopAppBar'
import { Select } from '../components/Select'
import { BackButton } from '../components/BackButton'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Toggle } from '../components/Toggle'
import { FILE_INFO } from '../components/RouteFiles'

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

const SyntaxHighlightedJson = ({ json }: { json: string }) => {
  if (!json) return null

  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

  const elements = []
  let lastIndex = 0
  let match: RegExpExecArray | null = regex.exec(json)
  let key = 0

  while (match !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={key++}>{json.substring(lastIndex, match.index)}</span>)
    }

    const part = match[0]
    let cls = 'text-green-300'
    if (/^"/.test(part)) {
      if (/:$/.test(part)) {
        cls = 'text-purple-300'
      }
    } else if (/true|false/.test(part)) {
      cls = 'text-red-300'
    } else if (/null/.test(part)) {
      cls = 'text-gray-500'
    } else {
      cls = 'text-orange-300'
    }

    elements.push(
      <span key={key++} className={cls}>
        {part}
      </span>,
    )
    lastIndex = regex.lastIndex
    match = regex.exec(json)
  }

  if (lastIndex < json.length) {
    elements.push(<span key={key++}>{json.substring(lastIndex)}</span>)
  }

  return <>{elements}</>
}

export const Component = () => {
  const { routeName, dongleId, date } = useParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const type: 'qlogs' | 'logs' = location.pathname.includes('qlogs') ? 'qlogs' : 'logs'

  const segment = Number(params.get('segment')) || 0
  const eventName = (params.get('eventName') as LogEvent) || 'CarState'
  const limit = Number(params.get('limit')) || 10
  const prettify = params.get('prettify') !== 'false'

  const [data, setData] = useState<any[]>()
  const [files] = useFiles(routeName)
  const url = files?.[type][segment]

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
      if (count >= limit) break
      console.log()
      const LogMonoTime = Number(new BigUint64Array(event.LogMonoTime.buffer.buffer).at(0)! / 1_000_000n)
      data.push({ LogMonoTime, ...event[eventName] })

      count++
    }
    setData(data)
  }, [url, eventName, segment, limit])

  const updateParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const newParams = new URLSearchParams(prev)
        newParams.set(key, value)
        return newParams
      },
      { replace: true },
    )
  }

  if (!files) return null
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TopAppBar leading={<BackButton fallback={`/${dongleId}/routes/${date}`} />}>
        <span className="capitalize">{FILE_INFO[type].label}</span>
      </TopAppBar>

      {/* Top Controls Bar */}
      <div className="flex items-center gap-3 p-3 bg-background border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
        <Select
          value={segment.toString()}
          onChange={(value) => updateParam('segment', value)}
          options={Array.from({ length: files.logs.length }).map((_, i) => ({ value: i.toString(), label: `Segment ${i}` }))}
          className="min-w-[120px]"
        />

        <Select
          value={eventName}
          onChange={(value) => updateParam('eventName', value)}
          options={LogEvent.options.map((x) => ({ value: x, label: x }))}
          className="min-w-[200px]"
        />

        <Select
          value={limit.toString()}
          onChange={(value) => updateParam('limit', value)}
          options={[10, 100, 500, 1000, 2000, 5000].map((x) => ({ value: x.toString(), label: `${x} items` }))}
          className="min-w-[120px]"
        />

        <div className="w-px h-6 bg-white/10 shrink-0" />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Toggle value={prettify} onChange={(v) => updateParam('prettify', String(v))} />
          <span className="text-xs font-medium text-white/60">Prettify</span>
        </label>
      </div>

      {/* Log Viewer */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {data ? (
            data.length > 0 ? (
              <div className="flex flex-col pb-4">
                {data.map((x, i) => (
                  <div key={i} className="flex hover:bg-white/5 rounded-lg gap-3 px-2 py-2 transition-colors">
                    <span className="select-none text-white/20 w-6 text-right shrink-0">{i + 1}</span>
                    <span className="break-all text-white/80 whitespace-pre-wrap">
                      <SyntaxHighlightedJson json={JSON.stringify(x, null, prettify ? 2 : undefined)} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/40 gap-2">
                <Icon name="error" className="text-white/20 text-4xl" />
                <span>No events found for {eventName}</span>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-white/40">
              <span className="animate-pulse">Loading logs...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
