import { and, desc, eq, gte, sql, sum } from 'drizzle-orm'
import { contract } from '../../shared/contract'
import { ForbiddenError, InternalServerError, tsr } from '../common'
import { db } from '../db/client'
import { athenaPingsTable, DeviceData, devicesTable, deviceUsersTable, segmentsTable } from '../db/schema'
import { deviceMiddleware } from '../middleware'
import { normalizeDataKey } from '../common'
import { Device } from '../../shared/types'
import { Identity } from '../auth'
import { getOfflineQueue } from '../ws'
import { createDataSignature } from '../helpers'
import { filesTable } from '../db/schema'
import { like } from 'drizzle-orm'

const getLogUrls = async (dongleId: string, type: 'boot' | 'crash', origin: string) => {
  const rows = db
    .select({ key: filesTable.key })
    .from(filesTable)
    .where(like(filesTable.key, `${dongleId}/${type}/%`))
    .all()
  return rows.map((r) => {
    const sig = createDataSignature(r.key, 'read_access', 24 * 60 * 60)
    return `${origin}/connectdata/${r.key}?sig=${sig}`
  })
}
export const deviceDataToDevice = async (device: DeviceData, identity: Identity): Promise<Device> => {
  const lastPing = await db.query.athenaPingsTable.findFirst({
    where: eq(athenaPingsTable.dongle_id, device.dongle_id),
    orderBy: desc(athenaPingsTable.create_time),
  })
  const owner = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.dongle_id, device.dongle_id), eq(deviceUsersTable.permission, 'owner')),
  })
  return {
    ...device,
    last_athena_ping: Math.round((lastPing?.create_time ?? device.create_time) / 1000),
    is_paired: !!owner,
    is_owner: identity.type === 'device' || owner?.user_id === identity.user.id,
    // prime
    eligible_features: { prime: true, prime_data: true, nav: true },
    prime: true,
    prime_type: 2,
    trial_claimed: true,
  }
}

export const device = tsr.routerWithMiddleware(contract.device)<{ userId?: string }>({
  get: deviceMiddleware(async (_, { device, identity }) => {
    return { status: 200, body: await deviceDataToDevice(device, identity) }
  }),
  athenaOfflineQueue: deviceMiddleware(async (_, { device }) => {
    const queue = await getOfflineQueue(device.dongle_id)
    return { status: 200, body: queue }
  }),
  bootlogs: deviceMiddleware(async (_, { device, origin }) => {
    return { status: 200, body: await getLogUrls(device.dongle_id, 'boot', origin) }
  }),
  crashlogs: deviceMiddleware(async (_, { device, origin }) => {
    return { status: 200, body: await getLogUrls(device.dongle_id, 'crash', origin) }
  }),
  location: deviceMiddleware(async (_, { device, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError('You have to be owner!')
    // Get the most recent segment for location
    const lastSegment = await db.query.segmentsTable.findFirst({
      where: eq(segmentsTable.dongle_id, device.dongle_id),
      orderBy: desc(segmentsTable.create_time),
    })
    return {
      status: 200,
      body: {
        dongle_id: device.dongle_id,
        lat: lastSegment?.end_lat ?? lastSegment?.start_lat ?? 0,
        lng: lastSegment?.end_lng ?? lastSegment?.start_lng ?? 0,
        time: lastSegment?.end_time ?? 0,
        accuracy: 0,
        bearing: 0,
        speed: 0,
      },
    }
  }),
  stats: deviceMiddleware(async (_, { device }) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    // Count distinct routes and sum distance from segments
    const allStats = await db
      .select({
        routes: sql<number>`count(distinct ${segmentsTable.route_id})`,
        distance: sum(segmentsTable.distance),
      })
      .from(segmentsTable)
      .where(eq(segmentsTable.dongle_id, device.dongle_id))

    const weekStats = await db
      .select({
        routes: sql<number>`count(distinct ${segmentsTable.route_id})`,
        distance: sum(segmentsTable.distance),
      })
      .from(segmentsTable)
      .where(and(eq(segmentsTable.dongle_id, device.dongle_id), gte(segmentsTable.create_time, weekAgo)))

    return {
      status: 200,
      body: {
        all: { distance: Number(allStats[0]?.distance) || 0, minutes: 0, routes: allStats[0]?.routes || 0 },
        week: { distance: Number(weekStats[0]?.distance) || 0, minutes: 0, routes: weekStats[0]?.routes || 0 },
      },
    }
  }),

  // OWNER
  set: deviceMiddleware(async ({ body }, { device, permission, identity }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')

    const newDevices = await db.update(devicesTable).set({ alias: body.alias }).where(eq(devicesTable.dongle_id, device.dongle_id)).returning()
    if (newDevices.length !== 1) throw new InternalServerError('Returned invalid amount of devices')

    return { status: 200, body: await deviceDataToDevice(newDevices[0], identity) }
  }),
  unpair: deviceMiddleware(async (_, { device, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')

    await db.delete(deviceUsersTable).where(eq(deviceUsersTable.dongle_id, device.dongle_id))

    return { status: 200, body: { success: 1 } }
  }),

  uploadFiles: deviceMiddleware(async ({ body, params }, { permission, origin }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')

    return {
      status: 200,
      body: body.paths.map((path) => {
        const key = normalizeDataKey(`${params.dongleId}/${path}`)
        const sig = createDataSignature(key, 'owner', body.expiry_days ? body.expiry_days * 60 * 60 * 24 : undefined)
        return { url: `${origin}/connectdata/${key}?sig=${sig}`, headers: {} }
      }),
    }
  }),
  getUploadUrl: deviceMiddleware(async ({ params, query }, { origin, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')

    const key = normalizeDataKey(`${params.dongleId}/${query.path}`)
    const sig = createDataSignature(key, 'owner', query.expiry_days ? query.expiry_days * 60 * 60 * 24 : undefined)
    return { status: 200, body: { url: `${origin}/connectdata/${key}?sig=${sig}`, headers: {} } }
  }),
})
