import { useEffect, useState } from 'react'
import { createClient } from '../../../shared/api'

type ServiceStatus = { status: 'ok' | 'error' | 'pending'; name?: string; latency?: number; error?: string }
type Heartbeat = { timestamp: number }

type StatusData = {
  status: 'ok' | 'degraded'
  uptime: number
  uptimeHistory?: Heartbeat[]
  services: { mkv: ServiceStatus; database: ServiceStatus }
  stats: { users: number; devices: number; routes: number; segments: number; queue: Record<string, number>; totalSize: number }
  frontends: ServiceStatus[]
  ci: ServiceStatus[]
}

const formatUptime = (ms: number) => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`
}

const Dot = ({ status }: { status: 'ok' | 'error' | 'pending' }) => {
  const color =
    status === 'ok'
      ? 'bg-green-500 shadow-[0_0_8px_#22c55e]'
      : status === 'pending'
        ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
        : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
  return <span className={`w-3 h-3 rounded-full inline-block ${color}`} />
}

const ServiceRow = ({ name, service }: { name: string; service: ServiceStatus }) => (
  <div className="flex justify-between items-center py-2">
    <span className="font-medium">{name}</span>
    <span className="flex items-center gap-2">
      {service.latency !== undefined && <span className="text-sm text-[#737373]">{service.latency}ms</span>}
      {service.error && <span className="text-sm text-[#737373]">{service.error}</span>}
      <Dot status={service.status} />
    </span>
  </div>
)

const ServiceRowLink = ({ name, service, url }: { name: string; service: ServiceStatus; url: string }) => (
  <div className="flex justify-between items-center py-2">
    <a href={url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
      {name}
    </a>
    <span className="flex items-center gap-2">
      {service.latency !== undefined && <span className="text-sm text-[#737373]">{service.latency}ms</span>}
      {service.error && <span className="text-sm text-[#737373]">{service.error}</span>}
      <Dot status={service.status} />
    </span>
  </div>
)

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-[#171717] border border-[#262626] rounded-lg p-5 mb-4">
    <div className="text-xs uppercase tracking-wide text-[#737373] mb-4">{title}</div>
    {children}
  </div>
)

const formatDate = (ms: number) => {
  const d = new Date(ms)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type DowntimePeriod = { start: number; end: number; duration: number }

const DOWNTIME_THRESHOLD = 2 * 60 * 1000 // 2 minutes - gap larger than this = downtime

const calculateDowntimes = (heartbeats: Heartbeat[]): DowntimePeriod[] => {
  if (heartbeats.length < 2) return []
  const sorted = [...heartbeats].sort((a, b) => a.timestamp - b.timestamp)
  const downtimes: DowntimePeriod[] = []
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp
    if (gap > DOWNTIME_THRESHOLD) {
      downtimes.push({
        start: sorted[i - 1].timestamp,
        end: sorted[i].timestamp,
        duration: gap,
      })
    }
  }
  return downtimes.sort((a, b) => b.end - a.end) // Most recent first
}

const Stat = ({ value, label }: { value: string | number; label: string }) => (
  <div className="text-center">
    <div className="text-3xl font-semibold">{value}</div>
    <div className="text-xs uppercase text-[#737373]">{label}</div>
  </div>
)

export const StatusPage = () => {
  const [data, setData] = useState<StatusData>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = createClient(() => undefined)
    const fetchStatus = () =>
      client.admin
        .status()
        .then((x) => setData(x.status === 200 ? x.body : undefined))
        .catch((e) => setError(String(e)))

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#737373]">Failed to fetch status: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-[#737373]">Loading...</p>
      </div>
    )
  }

  const queueEntries = ['queued', 'processing', 'done', 'error'].filter((s) => data.stats.queue[s])

  return (
    <>
      <Card title="API Services">
        <div className="divide-y divide-[#262626]">
          <ServiceRow name="MKV Storage" service={data.services.mkv} />
          <ServiceRow name="Database" service={data.services.database} />
        </div>
      </Card>

      <Card title="Frontends">
        <div className="divide-y divide-[#262626]">
          {data.frontends.map((f) => (
            <ServiceRowLink key={f.name} name={f.name!} service={f} url={`https://${f.name}`} />
          ))}
        </div>
      </Card>

      <Card title="GitHub CI">
        <div className="divide-y divide-[#262626]">
          {data.ci.map((c) => (
            <ServiceRowLink key={c.name} name={c.name!} service={c} url={`https://github.com/asiusai/${c.name}/actions`} />
          ))}
        </div>
      </Card>

      <Card title="Statistics">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Stat value={data.stats.users} label="Users" />
          <Stat value={data.stats.devices} label="Devices" />
          <Stat value={data.stats.routes} label="Routes" />
          <Stat value={data.stats.segments} label="Segments" />
          <Stat value={formatBytes(data.stats.totalSize)} label="Storage" />
        </div>
      </Card>

      <Card title="Processing Queue">
        {queueEntries.length === 0 ? (
          <div className="text-[#737373]">Queue empty</div>
        ) : (
          <div className="space-y-1">
            {queueEntries.map((s) => (
              <div key={s} className="flex justify-between">
                <span className="capitalize">{s}</span>
                <span>{data.stats.queue[s]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.uptimeHistory && data.uptimeHistory.length > 1 && (
        <Card title="Uptime History">
          {(() => {
            const downtimes = calculateDowntimes(data.uptimeHistory)
            if (downtimes.length === 0) {
              return <div className="text-green-500">No downtime recorded</div>
            }
            return (
              <div className="space-y-2">
                <div className="text-sm text-[#737373] mb-3">
                  {downtimes.length} restart{downtimes.length > 1 ? 's' : ''} detected
                </div>
                {downtimes.slice(0, 10).map((d, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#262626] last:border-0">
                    <span className="text-sm">{formatDate(d.end)}</span>
                    <span className="text-sm text-[#737373]">down ~{formatUptime(d.duration)}</span>
                  </div>
                ))}
                {downtimes.length > 10 && <div className="text-xs text-[#525252]">+ {downtimes.length - 10} more</div>}
              </div>
            )
          })()}
        </Card>
      )}

      <div className="text-xs text-[#525252] text-center mt-8">Uptime: {formatUptime(data.uptime)}</div>
    </>
  )
}
