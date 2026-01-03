import { desc } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { getDevice, NotFoundError, NotImplementedError, tsr } from '../common'
import { db } from '../db/client'
import { athenaPingsTable } from '../db/schema'

export const devices = tsr.router(contract.devices, {
  get: async ({ params }, { token }) => {
    const device = await getDevice(params.dongleId, token)
    if (!device) throw new NotFoundError()

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
  },
  addUser: async () => {
    throw new NotImplementedError()
  },
  athenaOfflineQueue: async () => {
    throw new NotImplementedError()
  },
  bootlogs: async () => {
    throw new NotImplementedError()
  },
  crashlogs: async () => {
    throw new NotImplementedError()
  },
  deleteUser: async () => {
    throw new NotImplementedError()
  },
  devices: async () => {
    throw new NotImplementedError()
  },
  location: async () => {
    throw new NotImplementedError()
  },
  pair: async () => {
    throw new NotImplementedError()
  },
  set: async () => {
    throw new NotImplementedError()
  },
  stats: async () => {
    throw new NotImplementedError()
  },
  unpair: async () => {
    throw new NotImplementedError()
  },
  uploadFiles: async () => {
    throw new NotImplementedError()
  },
  users: async () => {
    throw new NotImplementedError()
  },
  firehoseStats: async ({ params }, { token }) => {
    const device = await getDevice(params.dongleId, token)
    if (!device) throw new NotFoundError()
    return { status: 200, body: { firehose: 69 } }
  },
})
