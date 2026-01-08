import { useEffect, useState } from 'react'

type ServiceStatus = { status: 'ok' | 'error'; name?: string; latency?: number; error?: string }

type StatusData = {
  status: 'ok' | 'degraded'
  uptime: number
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

const Dot = ({ status }: { status: 'ok' | 'error' }) => (
  <span
    className={`w-3 h-3 rounded-full inline-block ${
      status === 'ok' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
    }`}
  />
)

const ServiceRow = ({ name, service }: { name: string; service: ServiceStatus }) => (
  <div className="flex justify-between items-center py-2">
    <span className="font-medium">{name}</span>
    <span className="flex items-center gap-2">
      {service.latency && <span className="text-sm text-[#737373]">{service.latency}ms</span>}
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
      {service.latency && <span className="text-sm text-[#737373]">{service.latency}ms</span>}
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

const Stat = ({ value, label }: { value: string | number; label: string }) => (
  <div className="text-center">
    <div className="text-3xl font-semibold">{value}</div>
    <div className="text-xs uppercase text-[#737373]">{label}</div>
  </div>
)

export const StatusPage = () => {
  const [data, setData] = useState<StatusData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://api.asius.ai'

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/status.json`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setData(await res.json())
        setError(null)
      } catch (e) {
        setError(String(e))
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <h1 className="text-2xl font-semibold">Asius Status</h1>
        </div>
        <p className="text-[#737373]">Failed to fetch status: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
          <h1 className="text-2xl font-semibold">Asius Status</h1>
        </div>
        <p className="text-[#737373]">Loading...</p>
      </div>
    )
  }

  const queueEntries = ['queued', 'processing', 'done', 'error'].filter((s) => data.stats.queue[s])

  return (
    <>
      <h1 className="text-2xl font-semibold mb-8 flex items-center gap-3 flex-wrap">
        <span
          className={`w-3 h-3 rounded-full ${
            data.status === 'ok' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
          }`}
        />
        Asius Status
        <span className="font-normal text-base text-[#737373]">
          {data.status === 'ok' ? 'All systems operational' : 'Service degraded'}
        </span>
      </h1>

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

      <div className="text-xs text-[#525252] text-center mt-8">Uptime: {formatUptime(data.uptime)}</div>
    </>
  )
}
