import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'
import { db } from '../db/client'
import { devicesTable, usersTable, segmentsTable, filesTable, uptimeTable } from '../db/schema'
import { sql, count, countDistinct, desc } from 'drizzle-orm'
import { env } from '../env'
import { getLastBackupTime } from '../db/backup'

const startTime = Date.now()
try {
  db.insert(uptimeTable).values({ event: 'start', timestamp: startTime }).run()
} catch {}

type ServiceStatus = { status: 'ok' | 'error'; latency?: number; error?: string }

const checkUrl = async (url: string): Promise<ServiceStatus> => {
  const start = Date.now()
  try {
    const res = await fetch(url)
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

const checkDb = (): ServiceStatus => {
  const start = Date.now()
  try {
    db.run(sql`SELECT 1`)
    return { status: 'ok', latency: Date.now() - start }
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

const FRONTENDS: [string, string][] = [
  ['api.asius.ai', 'https://api.asius.ai/health'],
  ['ssh.asius.ai', 'https://ssh.asius.ai/health'],
  ['comma.asius.ai', 'https://comma.asius.ai'],
  ['konik.asius.ai', 'https://konik.asius.ai'],
  ['connect.asius.ai', 'https://connect.asius.ai'],
  ['openpilot.asius.ai', 'https://openpilot.asius.ai'],
  ['sunnypilot.asius.ai', 'https://sunnypilot.asius.ai'],
]
const getFrontends = () => Promise.all(FRONTENDS.map(async ([name, url]) => ({ name, ...(await checkUrl(url)) })))

const CI_REPOS = ['asiusai', 'openpilot', 'sunnypilot']
let ciCache: { data: { name: string; status: 'ok' | 'error' | 'pending'; error?: string }[]; time: number } | null = null

const getCI = async () => {
  if (ciCache && Date.now() - ciCache.time < 5 * 60 * 1000) return ciCache.data
  const results = await Promise.all(
    CI_REPOS.map(async (name) => {
      try {
        // First check for any in-progress runs
        const pendingRes = await fetch(`https://api.github.com/repos/asiusai/${name}/actions/runs?per_page=1&status=in_progress`)
        if (pendingRes.ok) {
          const pendingRun = (await pendingRes.json()).workflow_runs?.[0]
          if (pendingRun) return { name, status: 'pending' as const }
        }

        // Then check the latest completed run
        const res = await fetch(`https://api.github.com/repos/asiusai/${name}/actions/runs?per_page=1&status=completed`)
        if (!res.ok) return { name, status: 'error' as const, error: `HTTP ${res.status}` }
        const run = (await res.json()).workflow_runs?.[0]
        if (!run) return { name, status: 'ok' as const }
        const ok = run.conclusion === 'success' || run.conclusion === 'skipped'
        return { name, status: ok ? ('ok' as const) : ('error' as const), error: ok ? undefined : run.conclusion }
      } catch (e) {
        return { name, status: 'error' as const, error: String(e) }
      }
    }),
  )
  ciCache = { data: results, time: Date.now() }
  return results
}

const getUptimeHistory = () => {
  try {
    return db
      .select()
      .from(uptimeTable)
      .orderBy(desc(uptimeTable.timestamp))
      .limit(100)
      .all()
      .map((e) => ({ event: e.event, timestamp: e.timestamp }))
  } catch {
    return []
  }
}

export const admin = tsr.router(contract.admin, {
  health: async () => ({ status: 200 as const, body: { status: 'ok' as const } }),
  status: async () => {
    const [mkv, database, stats, frontends, ci, lastBackup] = await Promise.all([
      checkMkv(),
      checkDb(),
      getStats(),
      getFrontends(),
      getCI(),
      getLastBackupTime(),
    ])
    return {
      status: 200,
      body: {
        status: (mkv.status === 'ok' && database.status === 'ok' ? 'ok' : 'degraded') as 'ok' | 'degraded',
        uptime: Date.now() - startTime,
        uptimeHistory: getUptimeHistory(),
        services: { mkv, database },
        stats,
        frontends,
        ci,
        lastBackup,
      },
    }
  },
})
