import { useState } from 'react'
import { LogReader } from '../../../shared/log-reader'
import { useFiles } from '../api/queries'
import { api } from '../api'
import { useAsyncEffect, useRouteParams } from '../hooks'
import { CircleAlertIcon } from 'lucide-react'
import { TopAppBar } from '../components/TopAppBar'
import { Select } from '../components/Select'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Toggle } from '../components/Toggle'
import { capitalize, FILE_INFO } from '../../../shared/helpers'
import { Service } from '../../../shared/types'
import { SyntaxHighlightedJson } from '../components/SyntaxHighlightedJson'

export const Component = () => {
  const { routeName } = useRouteParams()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const type: 'qlogs' | 'logs' = location.pathname.includes('qlogs') ? 'qlogs' : 'logs'

  const segment = Number(params.get('segment')) || 0
  const eventName: Service = (params.get('eventName') as Service) || 'carState'
  const limit = Number(params.get('limit')) || 10
  const prettify = params.get('prettify') !== 'false'

  const [data, setData] = useState<any[]>()
  const [route] = api.route.get.useQuery({ params: { routeName: routeName.replace('/', '|') }, query: {} })
  const [files] = useFiles(routeName, route)
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
      if (!(capitalize(eventName) in event)) continue
      if (count >= limit) break
      console.log()
      const LogMonoTime = Number(new BigUint64Array(event.LogMonoTime.buffer.buffer).at(0)! / 1_000_000n)
      data.push({ LogMonoTime, ...event[capitalize(eventName)] })

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
    <>
      <TopAppBar>
        <span className="capitalize">{FILE_INFO[type].label}</span>
      </TopAppBar>

      {/* Top Controls Bar */}
      <div className="flex items-center gap-3 p-3 bg-background border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
        <Select
          value={segment.toString()}
          onChange={(value) => updateParam('segment', value)}
          options={Array.from({ length: files.length }).map((_, i) => ({ value: i.toString(), label: `Segment ${i}` }))}
          className="min-w-30"
        />

        <Select
          value={eventName}
          onChange={(value) => updateParam('eventName', value)}
          options={Service.options.map((x) => ({ value: x, label: x }))}
          className="min-w-50"
        />

        <Select
          value={limit.toString()}
          onChange={(value) => updateParam('limit', value)}
          options={[10, 100, 500, 1000, 2000, 5000].map((x) => ({ value: x.toString(), label: `${x} items` }))}
          className="min-w-30"
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
                <CircleAlertIcon className="text-white/20 text-4xl" />
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
    </>
  )
}
