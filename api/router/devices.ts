import { eq } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { BadRequestError, decode, NotFoundError, randomId, tsr, verify } from '../common'
import { db } from '../db/client'
import { devicesTable, deviceUsersTable } from '../db/schema'
import { noMiddleware, userMiddleware } from '../middleware'
import { deviceDataToDevice } from './device'

export const devices = tsr.routerWithMiddleware(contract.devices)<{ userId?: string }>({
  devices: userMiddleware(async (_, { identity }) => {
    const devices = await db.query.deviceUsersTable.findMany({
      where: eq(deviceUsersTable.user_id, identity.user.id),
      with: { device: true },
    })

    return { status: 200, body: await Promise.all(devices.map((device) => deviceDataToDevice(device.device, identity))) }
  }),
  pair: userMiddleware(async ({ body: { pair_token } }, { identity }) => {
    const claim = decode<{ identity: string; pair: boolean }>(pair_token)
    if (!claim?.pair) throw new BadRequestError('Invalid token')

    const device = await db.query.devicesTable.findFirst({ where: eq(devicesTable.dongle_id, claim.identity), with: { users: true } })
    if (!device) throw new NotFoundError('No device found!')
    if (device.users.some((x) => x.permission === 'owner')) throw new BadRequestError('Device already paired!')

    if (!verify(pair_token, device.public_key)) throw new BadRequestError('Token verifycation failed')

    await db.insert(deviceUsersTable).values({ dongle_id: device.dongle_id, permission: 'owner', user_id: identity.user.id })
    return { status: 200, body: { dongle_id: device.dongle_id, first_pair: true } }
  }),
  register: noMiddleware(async ({ query: { public_key, register_token, ...info } }) => {
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
})
