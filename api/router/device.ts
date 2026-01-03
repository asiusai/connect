import { eq } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { BadRequestError, getDevice, NotFoundError, randomId, tsr, verify } from '../common'
import { db } from '../db/client'
import { devicesTable } from '../db/schema'
import { env } from '../env'

export const device = tsr.router(contract.device, {
  register: async ({ query: { public_key, register_token, ...info } }) => {
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
  },
  getUploadUrl: async ({ params, query }, { token }) => {
    // const device = await getDevice(params.dongleId, token)
    // if (!device) throw new NotFoundError()
      console.log(query)
    return {
      status: 200,
      body: { url: `${env.API_URL}/storage/${params.dongleId}/${query.path}`, headers: {} },
    }
  },
})
