import { desc, eq } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { BadRequestError, NotImplementedError, randomId, tsr, verify } from '../common'
import { db } from '../db/client'
import { athenaPingsTable, devicesTable } from '../db/schema'
import { authenticatedMiddleware, createDataSignature, deviceMiddleware, unAuthenticatedMiddleware } from '../middleware'

export const devices = tsr.routerWithMiddleware(contract.devices)<{ userId?: string }>({
  get: deviceMiddleware(async (_, { device }) => {
    const lastPing = await db.query.athenaPingsTable.findFirst({ orderBy: desc(athenaPingsTable.create_time) })
    return {
      status: 200,
      body: {
        ...device,
        eligible_features: { prime: true, prime_data: true, nav: true },
        is_owner: true,
        is_paired: true,
        prime: true,
        prime_type: 2,
        trial_claimed: true,
        last_athena_ping: lastPing?.create_time.getTime() ?? device.create_time.getTime(),
      },
    }
  }),
  addUser: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  athenaOfflineQueue: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  bootlogs: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  crashlogs: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  deleteUser: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  devices: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  location: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  pair: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  set: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  stats: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  unpair: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  uploadFiles: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  users: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  firehoseStats: deviceMiddleware(async () => {
    // TODO
    return { status: 200, body: { firehose: 69 } }
  }),
  register: unAuthenticatedMiddleware(async ({ query: { public_key, register_token, ...info } }) => {
    const data = verify<{ register: boolean; exp: number }>(register_token, public_key)
    if (!data?.register) throw new BadRequestError()

    // Checking if device alread has registered
    const device = await db.query.devicesTable.findFirst({ where: eq(devicesTable.public_key, public_key) })
    if (device) {
      await db.update(devicesTable).set(info).where(eq(devicesTable.dongle_id, device.dongle_id))
      return { status: 200, body: { dongle_id: device.dongle_id } }
    }

    const dongleId = randomId()
    await db.insert(devicesTable).values({ dongle_id: dongleId, ...info, public_key })
    return { status: 200, body: { dongle_id: dongleId } }
  }),
  getUploadUrl: deviceMiddleware(async ({ params, query }, { origin }) => {
    const key = `${params.dongleId}/${query.path}`
    const sig = createDataSignature(key, 'owner')
    const url = `${origin}/connectdata/${key}?sig=${sig}`
    return { status: 200, body: { url, headers: {} } }
  }),
})
