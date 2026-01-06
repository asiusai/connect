import { and, desc, eq } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { ForbiddenError, InternalServerError, NotImplementedError, tsr } from '../common'
import { db } from '../db/client'
import { athenaPingsTable, DeviceData, devicesTable, deviceUsersTable } from '../db/schema'
import { createDataSignature, deviceMiddleware } from '../middleware'
import { Device } from '../../connect/src/types'
import { Identity } from '../auth'

export const deviceDataToDevice = async (device: DeviceData, identity: Identity): Promise<Device> => {
  const lastPing = await db.query.athenaPingsTable.findFirst({ orderBy: desc(athenaPingsTable.create_time) })
  const owner = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.dongle_id, device.dongle_id), eq(deviceUsersTable.permission, 'owner')),
  })
  return {
    ...device,
    last_athena_ping: lastPing?.create_time.getTime() ?? device.create_time.getTime(),
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
    throw new NotImplementedError(`${device.dongle_id} offline queue`)
  }),
  bootlogs: deviceMiddleware(async (_, { device }) => {
    throw new NotImplementedError(`${device.dongle_id} bootlogs`)
  }),
  crashlogs: deviceMiddleware(async (_, { device }) => {
    throw new NotImplementedError(`${device.dongle_id} crashlogs`)
  }),
  location: deviceMiddleware(async (_, { device }) => {
    // TODO
    return { status: 200, body: { dongle_id: device.dongle_id, lat: 0, lng: 0, time: 0, accuracy: 0, bearing: 0, speed: 0 } }
  }),

  stats: deviceMiddleware(async () => {
    // TODO
    return { status: 200, body: { all: { distance: 0, minutes: 0, routes: 0 }, week: { distance: 0, minutes: 0, routes: 0 } } }
  }),
  firehoseStats: deviceMiddleware(async () => {
    // TODO
    return { status: 200, body: { firehose: 69 } }
  }),

  // OWNER
  set: deviceMiddleware(async ({ body }, { device, permission, identity }) => {
    if (permission !== 'owner') throw new ForbiddenError()

    const newDevices = await db.update(devicesTable).set({ alias: body.alias }).where(eq(devicesTable.dongle_id, device.dongle_id)).returning()
    if (newDevices.length !== 1) throw new InternalServerError('Returned invalid amount of devices')

    return { status: 200, body: await deviceDataToDevice(newDevices[0], identity) }
  }),
  unpair: deviceMiddleware(async (_, { device, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError()

    await db.delete(deviceUsersTable).where(eq(deviceUsersTable.dongle_id, device.dongle_id))

    return { status: 200, body: { success: 1 } }
  }),

  uploadFiles: deviceMiddleware(async ({ body, params }, { permission, origin }) => {
    if (permission !== 'owner') throw new ForbiddenError()

    return {
      status: 200,
      body: body.paths.map((path) => {
        const key = `${params.dongleId}/${path}`
        const sig = createDataSignature(key, 'owner', body.expiry_days ? body.expiry_days * 60 * 60 * 24 : undefined)
        return { url: `${origin}/connectdata/${key}?sig=${sig}`, headers: {} }
      }),
    }
  }),
  getUploadUrl: deviceMiddleware(async ({ params, query }, { origin, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError()

    const key = `${params.dongleId}/${query.path}`
    const sig = createDataSignature(key, 'owner', query.expiry_days ? query.expiry_days * 60 * 60 * 24 : undefined)
    return { status: 200, body: { url: `${origin}/connectdata/${key}?sig=${sig}`, headers: {} } }
  }),
})
