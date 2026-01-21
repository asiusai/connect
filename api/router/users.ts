import { and, eq } from 'drizzle-orm'
import { contract } from '../../shared/contract'
import { BadRequestError, ForbiddenError, NotFoundError, tsr } from '../common'
import { db } from '../db/client'
import { deviceUsersTable, usersTable } from '../db/schema'
import { deviceMiddleware } from '../middleware'

export const users = tsr.router(contract.users, {
  get: deviceMiddleware(async (_, { device, identity }) => {
    if (identity.type === 'device') throw new ForbiddenError('Only accessible from user')

    const deviceUsers = await db.query.deviceUsersTable.findMany({
      where: eq(deviceUsersTable.dongle_id, device.dongle_id),
      with: { user: true },
    })

    return {
      status: 200,
      body: deviceUsers.map((du) => ({
        email: du.user.email,
        permission: du.permission,
      })),
    }
  }),
  addUser: deviceMiddleware(async ({ body }, { device, permission, identity }) => {
    if (identity.type === 'device') throw new ForbiddenError('Only accessible from user')
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, body.email) })
    if (!user) throw new NotFoundError('User not found')

    const existing = await db.query.deviceUsersTable.findFirst({
      where: and(eq(deviceUsersTable.dongle_id, device.dongle_id), eq(deviceUsersTable.user_id, user.id)),
    })
    if (existing) throw new BadRequestError('User already has access')

    await db.insert(deviceUsersTable).values({
      dongle_id: device.dongle_id,
      user_id: user.id,
      permission: 'read_access',
    })

    return { status: 200, body: { success: 1 } }
  }),
  deleteUser: deviceMiddleware(async ({ body }, { device, permission, identity }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, body.email) })
    if (!user) throw new NotFoundError('User not found')

    if (identity.type === 'user' && user.id === identity.user.id) {
      throw new BadRequestError('Cannot remove yourself')
    }

    const deleted = await db
      .delete(deviceUsersTable)
      .where(and(eq(deviceUsersTable.dongle_id, device.dongle_id), eq(deviceUsersTable.user_id, user.id)))
      .returning()

    if (deleted.length === 0) throw new NotFoundError('User does not have access')

    return { status: 200, body: { success: 1 } }
  }),
})
