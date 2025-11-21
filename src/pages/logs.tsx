import { useState } from 'react'
import { LogReader } from '../../log-reader'
import { useFiles } from '../api/queries'
import { useAsyncEffect, useParams } from '../utils/hooks'
import { TopAppBar } from '../components/material/TopAppBar'
import { IconButton } from '../components/material/IconButton'
import { Icon } from '../components/material/Icon'
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

  const segment = Number(params.get('segment')) || 0
  const eventName = (params.get('eventName') as LogEvent) || 'DrivingModelData'
  const limit = Number(params.get('limit')) || 100
  const prettify = params.get('prettify') !== 'false'

  const [data, setData] = useState<any[]>()
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
      if (count >= limit) break

      data.push(event[eventName])

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

  return (
    <div className="flex flex-col h-screen bg-surface text-on-surface">
      <TopAppBar leading={<IconButton name="keyboard_arrow_left" href={`/${dongleId}/routes/${date}`} />}>Logs</TopAppBar>

      {/* Top Controls Bar */}
      <div className="flex items-center gap-1 p-2 rounded-md bg-surface-container-low shrink-0 overflow-x-auto">
        <div className="relative">
          <select
            value={segment}
            onChange={(e) => updateParam('segment', e.currentTarget.value)}
            className="appearance-none bg-surface-container py-1.5 pl-3 pr-8 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer min-w-[120px]"
          >
            {files &&
              Array.from({ length: files.logs.length }).map((_, i) => (
                <option key={i} value={i}>
                  Segment {i}
                </option>
              ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
            <Icon name="keyboard_arrow_down" size="20" />
          </div>
        </div>

        <div className="w-px h-6 bg-outline-variant/20 shrink-0" />

        <div className="relative">
          <select
            value={eventName}
            onChange={(e) => updateParam('eventName', e.currentTarget.value)}
            className="appearance-none bg-surface-container py-1.5 pl-3 pr-8 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer min-w-[200px]"
          >
            {LogEvent.options.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
            <Icon name="keyboard_arrow_down" size="20" />
          </div>
        </div>

        <div className="w-px h-6 bg-outline-variant/20 shrink-0" />

        <div className="relative">
          <select
            value={limit}
            onChange={(e) => updateParam('limit', e.currentTarget.value)}
            className="appearance-none bg-surface-container py-1.5 pl-3 pr-8 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer min-w-[100px]"
          >
            {[10, 100, 500, 1000, 2000, 5000].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
            <Icon name="keyboard_arrow_down" size="20" />
          </div>
        </div>

        <div className="w-px h-6 bg-outline-variant/20 shrink-0" />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={prettify}
              onChange={(e) => updateParam('prettify', String(e.target.checked))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </div>
          <span className="text-label-sm font-medium text-on-surface-variant">Prettify</span>
        </label>
      </div>

      {/* Log Viewer */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {data ? (
            data.length > 0 ? (
              <div className="flex flex-col pb-4">
                {data.map((x, i) => (
                  <div key={i} className="flex hover:bg-surface-container-low transition-colors rounded-md gap-3 px-2 py-2">
                    <span className="select-none text-on-surface-variant/50 w-4 text-right shrink-0">{i + 1}</span>
                    <span className="break-all text-on-surface whitespace-pre-wrap">
                      <SyntaxHighlightedJson json={JSON.stringify(x, null, prettify ? 2 : undefined)} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-2">
                <Icon name="error" size="40" className="text-on-surface-variant/50" />
                <span>No events found for {eventName}</span>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-on-surface-variant">
              <span className="animate-pulse">Loading logs...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
