import { eq } from 'drizzle-orm'
import { db } from './db/client'
import { UserData, DeviceData, usersTable, devicesTable } from './db/schema'
import { decode, verify } from './common'
import { env } from './env'

export type Identity = { type: 'user'; id: string; user: UserData } | { type: 'device'; id: string; device: DeviceData }
export type Claim = { exp: number; nbf: number; iat: number; identity: string }
export const auth = async (req: Request): Promise<Identity | undefined> => {
  const token = req.headers.get('Authorization')?.replace('JWT ', '') ?? req.headers.get('cookie')?.replace('jwt=', '')
  const claim = decode<Claim>(token)
  if (!claim?.identity) return

  // User tokens are signed by out JWT_SECRET
  const isUser = verify(token, env.JWT_SECRET)
  if (isUser) {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, claim.identity) })
    if (!user) return
    return { type: 'user', id: user.id, user }
  }

  // Device tokens are signed by device private key
  const device = await db.query.devicesTable.findFirst({ where: eq(devicesTable.dongle_id, claim.identity) })
  if (!device) return

  const isDevice = verify(token, device.public_key)
  if (!isDevice) return

  return { type: 'device', id: device.dongle_id, device }
}
