import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'
import { db } from '../db/client'
import {
  devicesTable,
  usersTable,
  segmentsTable,
  filesTable,
  uptimeTable,
  deviceUsersTable,
  routesTable,
  athenaPingsTable,
  athenaQueueTable,
  statsTable,
  logsTable,
} from '../db/schema'
import { sql, count, countDistinct, desc, eq, asc, and } from 'drizzle-orm'
import { env } from '../env'
import { getLastBackupTime } from '../db/backup'
import { superuserMiddleware } from '../middleware'
import { mkv } from '../mkv'

const startTime = Date.now()
const HEARTBEAT_INTERVAL = 60 * 1000 // 1 minute

const recordHeartbeat = () => {
  try {
    db.insert(uptimeTable).values({ timestamp: Date.now() }).run()
    // Keep only last 1000 heartbeats
    db.run(sql`DELETE FROM uptime WHERE id NOT IN (SELECT id FROM uptime ORDER BY timestamp DESC LIMIT 1000)`)
  } catch {}
}

recordHeartbeat()
setInterval(recordHeartbeat, HEARTBEAT_INTERVAL)

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
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`
  const results = await Promise.all(
    CI_REPOS.map(async (name) => {
      try {
        // First check for any in-progress runs
        const pendingRes = await fetch(`https://api.github.com/repos/asiusai/${name}/actions/runs?per_page=1&status=in_progress`, { headers })
        if (pendingRes.ok) {
          const pendingRun = (await pendingRes.json()).workflow_runs?.[0]
          if (pendingRun) return { name, status: 'pending' as const }
        }

        // Then check the latest completed run
        const res = await fetch(`https://api.github.com/repos/asiusai/${name}/actions/runs?per_page=1&status=completed`, { headers })
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
      .limit(200)
      .all()
      .map((e) => ({ timestamp: e.timestamp }))
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
  users: superuserMiddleware(async ({ query }) => {
    const limit = query.limit ?? 100
    const offset = query.offset ?? 0

    const [users, totalResult] = await Promise.all([
      db.select().from(usersTable).limit(limit).offset(offset).all(),
      db
        .select({ count: count() })
        .from(usersTable)
        .then((r) => r[0].count),
    ])

    const deviceCounts = await db
      .select({ user_id: deviceUsersTable.user_id, count: count() })
      .from(deviceUsersTable)
      .where(eq(deviceUsersTable.permission, 'owner'))
      .groupBy(deviceUsersTable.user_id)
      .all()
    const deviceCountMap = Object.fromEntries(deviceCounts.map((x) => [x.user_id, x.count]))

    const fileSizes = await db
      .select({
        user_id: deviceUsersTable.user_id,
        totalSize: sql<number>`coalesce(sum(${filesTable.size}), 0)`,
      })
      .from(deviceUsersTable)
      .leftJoin(filesTable, eq(deviceUsersTable.dongle_id, filesTable.dongle_id))
      .where(eq(deviceUsersTable.permission, 'owner'))
      .groupBy(deviceUsersTable.user_id)
      .all()
    const fileSizeMap = Object.fromEntries(fileSizes.map((x) => [x.user_id, x.totalSize]))

    return {
      status: 200,
      body: {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          regdate: u.regdate,
          superuser: u.superuser,
          user_id: u.user_id,
          username: u.username,
          deviceCount: deviceCountMap[u.id] ?? 0,
          totalSize: fileSizeMap[u.id] ?? 0,
        })),
        total: totalResult,
      },
    }
  }),
  devices: superuserMiddleware(async ({ query }) => {
    const limit = query.limit ?? 100
    const offset = query.offset ?? 0

    let devices: (typeof devicesTable.$inferSelect)[]
    let totalCount: number

    if (query.user_id) {
      const userDevices = await db
        .select({ dongle_id: deviceUsersTable.dongle_id })
        .from(deviceUsersTable)
        .where(and(eq(deviceUsersTable.user_id, query.user_id), eq(deviceUsersTable.permission, 'owner')))
        .all()
      const dongleIds = userDevices.map((x) => x.dongle_id)
      if (dongleIds.length === 0) return { status: 200, body: { devices: [], total: 0 } }

      const whereClause = sql`${devicesTable.dongle_id} IN (${sql.join(
        dongleIds.map((id) => sql`${id}`),
        sql`, `,
      )})`

      const [devicesResult, countResult] = await Promise.all([
        db.select().from(devicesTable).where(whereClause).limit(limit).offset(offset).all(),
        db
          .select({ count: count() })
          .from(devicesTable)
          .where(whereClause)
          .then((r) => r[0].count),
      ])
      devices = devicesResult
      totalCount = countResult
    } else {
      const [devicesResult, countResult] = await Promise.all([
        db.select().from(devicesTable).limit(limit).offset(offset).all(),
        db
          .select({ count: count() })
          .from(devicesTable)
          .then((r) => r[0].count),
      ])
      devices = devicesResult
      totalCount = countResult
    }

    const owners = await db
      .select({ dongle_id: deviceUsersTable.dongle_id, email: usersTable.email })
      .from(deviceUsersTable)
      .leftJoin(usersTable, eq(deviceUsersTable.user_id, usersTable.id))
      .where(eq(deviceUsersTable.permission, 'owner'))
      .all()
    const ownerMap = Object.fromEntries(owners.map((x) => [x.dongle_id, x.email]))

    const fileCounts = await db
      .select({
        dongle_id: filesTable.dongle_id,
        count: count(),
        totalSize: sql<number>`coalesce(sum(${filesTable.size}), 0)`,
      })
      .from(filesTable)
      .groupBy(filesTable.dongle_id)
      .all()
    const fileCountMap = Object.fromEntries(fileCounts.map((x) => [x.dongle_id, { count: x.count, totalSize: x.totalSize }]))

    return {
      status: 200,
      body: {
        devices: devices.map((d) => ({
          dongle_id: d.dongle_id,
          alias: d.alias,
          device_type: d.device_type,
          serial: d.serial,
          create_time: d.create_time,
          ownerEmail: ownerMap[d.dongle_id] ?? null,
          fileCount: fileCountMap[d.dongle_id]?.count ?? 0,
          totalSize: fileCountMap[d.dongle_id]?.totalSize ?? 0,
        })),
        total: totalCount,
      },
    }
  }),
  files: superuserMiddleware(async ({ query }) => {
    const limit = query.limit ?? 100
    const offset = query.offset ?? 0
    const sort = query.sort ?? 'create_time'
    const order = query.order ?? 'desc'

    const conditions = []
    if (query.status) conditions.push(eq(filesTable.processingStatus, query.status))
    if (query.dongle_id) conditions.push(eq(filesTable.dongle_id, query.dongle_id))
    if (query.route_id) conditions.push(eq(filesTable.route_id, query.route_id))
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const sortColumn = sort === 'size' ? filesTable.size : filesTable.create_time
    const orderFn = order === 'asc' ? asc : desc

    const [files, totalResult] = await Promise.all([
      db.select().from(filesTable).where(whereClause).orderBy(orderFn(sortColumn)).limit(limit).offset(offset).all(),
      db
        .select({ count: count() })
        .from(filesTable)
        .where(whereClause)
        .then((r) => r[0].count),
    ])

    return {
      status: 200,
      body: {
        files: files.map((f) => ({
          key: f.key,
          dongle_id: f.dongle_id,
          route_id: f.route_id,
          segment: f.segment,
          file: f.file,
          size: f.size,
          processingStatus: f.processingStatus,
          processingError: f.processingError,
          create_time: f.create_time,
        })),
        total: totalResult,
      },
    }
  }),
  routes: superuserMiddleware(async ({ query }) => {
    const limit = query.limit ?? 100
    const offset = query.offset ?? 0
    const sort = query.sort ?? 'create_time'
    const order = query.order ?? 'desc'

    const conditions = []
    if (query.dongle_id) conditions.push(eq(segmentsTable.dongle_id, query.dongle_id))
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const sortColumn = sort === 'size' ? sql<number>`coalesce(sum(${filesTable.size}), 0)` : sql<number>`min(${segmentsTable.create_time})`
    const orderFn = order === 'asc' ? asc : desc

    const [routesData, totalResult] = await Promise.all([
      db
        .select({
          dongle_id: segmentsTable.dongle_id,
          route_id: segmentsTable.route_id,
          start_time: sql<number | null>`min(${segmentsTable.start_time})`,
          end_time: sql<number | null>`max(${segmentsTable.end_time})`,
          platform: sql<string | null>`max(${segmentsTable.platform})`,
          version: sql<string | null>`max(${segmentsTable.version})`,
          create_time: sql<number>`min(${segmentsTable.create_time})`,
          segmentCount: sql<number>`count(distinct ${segmentsTable.segment})`,
          fileCount: sql<number>`count(distinct ${filesTable.key})`,
          totalSize: sql<number>`coalesce(sum(${filesTable.size}), 0)`,
        })
        .from(segmentsTable)
        .leftJoin(filesTable, and(eq(segmentsTable.dongle_id, filesTable.dongle_id), eq(segmentsTable.route_id, filesTable.route_id)))
        .where(whereClause)
        .groupBy(segmentsTable.dongle_id, segmentsTable.route_id)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset)
        .all(),
      db
        .select({ count: countDistinct(sql`${segmentsTable.dongle_id} || '/' || ${segmentsTable.route_id}`) })
        .from(segmentsTable)
        .where(whereClause)
        .then((r) => r[0].count),
    ])

    return {
      status: 200,
      body: {
        routes: routesData.map((r) => ({
          dongle_id: r.dongle_id,
          route_id: r.route_id,
          segmentCount: r.segmentCount,
          fileCount: r.fileCount,
          totalSize: r.totalSize,
          start_time: r.start_time,
          end_time: r.end_time,
          platform: r.platform,
          version: r.version,
          create_time: r.create_time,
        })),
        total: totalResult,
      },
    }
  }),
  deleteFile: superuserMiddleware(async ({ params }) => {
    const key = decodeURIComponent(params.key)
    const file = db.select().from(filesTable).where(eq(filesTable.key, key)).get()
    if (!file) return { status: 404, body: { error: 'File not found' } }

    await mkv.delete(key)
    db.delete(filesTable).where(eq(filesTable.key, key)).run()

    return { status: 200, body: { success: true } }
  }),
  updateFileStatus: superuserMiddleware(async ({ params, body }) => {
    const key = decodeURIComponent(params.key)
    const file = db.select().from(filesTable).where(eq(filesTable.key, key)).get()
    if (!file) return { status: 404, body: { error: 'File not found' } }

    db.update(filesTable).set({ processingStatus: body.status, processingError: null, retries: 0 }).where(eq(filesTable.key, key)).run()

    return { status: 200, body: { success: true } }
  }),
  deleteDevice: superuserMiddleware(async ({ params }) => {
    const device = db.select().from(devicesTable).where(eq(devicesTable.dongle_id, params.dongleId)).get()
    if (!device) return { status: 404, body: { error: 'Device not found' } }

    const files = db.select({ key: filesTable.key }).from(filesTable).where(eq(filesTable.dongle_id, params.dongleId)).all()

    // Delete all MKV files for this device
    await Promise.all(files.map((f) => mkv.delete(f.key).catch(() => {})))

    // Also delete the device folder in MKV (for any other files like boot logs)
    const mkvKeys = await mkv.listKeys(params.dongleId)
    await Promise.all(mkvKeys.map((k) => mkv.delete(k).catch(() => {})))

    // Delete all database records
    db.delete(filesTable).where(eq(filesTable.dongle_id, params.dongleId)).run()
    db.delete(segmentsTable).where(eq(segmentsTable.dongle_id, params.dongleId)).run()
    db.delete(routesTable).where(eq(routesTable.dongle_id, params.dongleId)).run()
    db.delete(athenaPingsTable).where(eq(athenaPingsTable.dongle_id, params.dongleId)).run()
    db.delete(athenaQueueTable).where(eq(athenaQueueTable.dongle_id, params.dongleId)).run()
    db.delete(statsTable).where(eq(statsTable.dongle_id, params.dongleId)).run()
    db.delete(logsTable).where(eq(logsTable.dongle_id, params.dongleId)).run()
    db.delete(deviceUsersTable).where(eq(deviceUsersTable.dongle_id, params.dongleId)).run()
    db.delete(devicesTable).where(eq(devicesTable.dongle_id, params.dongleId)).run()

    return { status: 200, body: { success: true, deletedFiles: files.length } }
  }),
})
