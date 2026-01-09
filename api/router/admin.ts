import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'
import { db } from '../db/client'
import { devicesTable, usersTable, segmentsTable, filesTable, uptimeTable } from '../db/schema'
import { sql, count, countDistinct, desc } from 'drizzle-orm'
import { env } from '../env'

const startTime = Date.now()

// Record server start event
const recordStart = () => {
  try {
    db.insert(uptimeTable).values({ event: 'start', timestamp: startTime }).run()
  } catch {
    // Table might not exist yet, ignore
  }
}
recordStart()

type ServiceStatus = { status: 'ok' | 'error'; latency?: number; error?: string }

const checkUrl = async (url: string): Promise<ServiceStatus> => {
  const start = Date.now()
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) return { status: 'error', error: `HTTP ${res.status}` }
    return { status: 'ok', latency: Date.now() - start }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}

const checkMkv = async (): Promise<ServiceStatus> => {
  const start = Date.now()
  try {
    const res = await fetch(`${env.MKV_URL}/__health_check__`)
    if (res.status >= 500) return { status: 'error', error: `HTTP ${res.status}` }
    return { status: 'ok', latency: Date.now() - start }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}

const checkDb = async (): Promise<ServiceStatus> => {
  const start = Date.now()
  try {
    db.run(sql`SELECT 1`)
    return { status: 'ok', latency: Date.now() - start }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}

const checkGitHubCI = async (repo: string): Promise<ServiceStatus> => {
  try {
    const res = await fetch(`https://api.github.com/repos/asiusai/${repo}/actions/runs?per_page=1&status=completed`)
    if (!res.ok) return { status: 'error', error: `HTTP ${res.status}` }
    const data = await res.json()
    const run = data.workflow_runs?.[0]
    if (!run) return { status: 'ok' }
    const ok = run.conclusion === 'success' || run.conclusion === 'skipped'
    return { status: ok ? 'ok' : 'error', error: ok ? undefined : run.conclusion }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}

const getStats = async () => {
  const [users, devices, routes, segments, queue, totalSize] = await Promise.all([
    db
      .select({ count: count() })
      .from(usersTable)
      .then((r) => r[0].count),
    db
      .select({ count: count() })
      .from(devicesTable)
      .then((r) => r[0].count),
    db
      .select({ count: countDistinct(segmentsTable.route_id) })
      .from(segmentsTable)
      .then((r) => r[0].count),
    db
      .select({ count: count() })
      .from(segmentsTable)
      .then((r) => r[0].count),
    db
      .select({ status: filesTable.processingStatus, count: count() })
      .from(filesTable)
      .groupBy(filesTable.processingStatus)
      .then((r) => Object.fromEntries(r.map((x) => [x.status, x.count]))),
    db
      .select({ total: sql<number>`coalesce(sum(${filesTable.size}), 0)` })
      .from(filesTable)
      .then((r) => r[0].total),
  ])
  return { users, devices, routes, segments, queue, totalSize }
}

const checkApiHealth = async (): Promise<ServiceStatus> => {
  const start = Date.now()
  try {
    const res = await fetch('https://api.asius.ai/health')
    if (!res.ok) return { status: 'error', error: `HTTP ${res.status}` }
    return { status: 'ok', latency: Date.now() - start }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}

const getFrontends = async () => {
  const sites = [
    { name: 'api.asius.ai', check: checkApiHealth },
    { name: 'comma.asius.ai', url: 'https://comma.asius.ai' },
    { name: 'konik.asius.ai', url: 'https://konik.asius.ai' },
    { name: 'connect.asius.ai', url: 'https://connect.asius.ai' },
    { name: 'openpilot.asius.ai', url: 'https://openpilot.asius.ai' },
    { name: 'sunnypilot.asius.ai', url: 'https://sunnypilot.asius.ai' },
  ]
  const results = await Promise.all(
    sites.map(async (s) => ({
      name: s.name,
      ...(s.check ? await s.check() : await checkUrl(s.url!)),
    })),
  )
  return results
}

let ciCache: { data: { name: string; status: 'ok' | 'error'; error?: string }[]; time: number } | null = null
const CI_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const getCI = async () => {
  if (ciCache && Date.now() - ciCache.time < CI_CACHE_TTL) return ciCache.data

  const repos = ['asiusai', 'connect', 'openpilot', 'sunnypilot']
  const results = await Promise.all(repos.map(async (r) => ({ name: r, ...(await checkGitHubCI(r)) })))
  ciCache = { data: results, time: Date.now() }
  return results
}

const getUptimeHistory = () => {
  try {
    const events = db.select().from(uptimeTable).orderBy(desc(uptimeTable.timestamp)).limit(100).all()
    return events.map((e) => ({ event: e.event, timestamp: e.timestamp }))
  } catch {
    return []
  }
}

export const admin = tsr.router(contract.admin, {
  health: async () => ({ status: 200 as const, body: { status: 'ok' as const } }),
  status: async () => {
    const [mkv, database, stats, frontends, ci] = await Promise.all([checkMkv(), checkDb(), getStats(), getFrontends(), getCI()])
    const uptimeHistory = getUptimeHistory()

    return {
      status: 200,
      body: {
        status: (mkv.status === 'ok' && database.status === 'ok' ? 'ok' : 'degraded') as 'ok' | 'degraded',
        uptime: Date.now() - startTime,
        uptimeHistory,
        services: { mkv, database },
        stats,
        frontends,
        ci,
      },
    }
  },
})
