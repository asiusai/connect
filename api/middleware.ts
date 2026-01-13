import { and, eq } from 'drizzle-orm'
import { Context, UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError, verify } from './common'
import { db } from './db/client'
import { deviceUsersTable, devicesTable } from './db/schema'
import { env } from './env'
import { aggregateRoute, DataSignature, RouteSignature } from './helpers'

type Ctx = { request: Request; appRoute: any; responseHeaders: Headers } & Context
type MiddleWare<Req, CtxOut> = (req: Req, ctx: Ctx) => Promise<CtxOut>
type Fn<Req, Ctx, Res> = (req: Req, ctx: Ctx) => Promise<Res>

export const createMiddleware = <OuterReq, CtxOut>(middleware: MiddleWare<OuterReq, CtxOut>) => {
  return <InnerReq extends OuterReq, Res>(fn: Fn<InnerReq, CtxOut, Res>) => {
    return async (req: InnerReq, ctx: Ctx) => {
      const newCtx = await middleware(req, ctx)
      return await fn(req, newCtx)
    }
  }
}

export const noMiddleware = createMiddleware(async (_, ctx) => ({ ...ctx }))

export const authenticatedMiddleware = createMiddleware(async (_, ctx) => {
  const identity = ctx.identity
  if (!identity) throw new UnauthorizedError('Authentication required')
  return { ...ctx, identity }
})

export const userMiddleware = createMiddleware(async (_, ctx) => {
  const identity = ctx.identity
  if (!identity || identity.type !== 'user') throw new UnauthorizedError('User authentication required')
  return { ...ctx, identity }
})

export const superuserMiddleware = createMiddleware(async (_, ctx) => {
  const identity = ctx.identity
  if (!identity || identity.type !== 'user') throw new UnauthorizedError('User authentication required')
  if (!identity.user.superuser) throw new ForbiddenError('Superuser access required')
  return { ...ctx, identity }
})

/**
 * Checks if device or user has access to the requested device
 */
export const deviceMiddleware = createMiddleware(async (req: { params: { dongleId: string } }, { identity, request, ...ctx }) => {
  if (!identity) throw new UnauthorizedError('Authentication required')

  // device
  if (identity.type === 'device') {
    if (identity.device.dongle_id !== req.params.dongleId) throw new ForbiddenError('Device mismatch')
    return { ...ctx, request, identity, device: identity.device, permission: 'owner' as const }
  }
  const device = await db.query.devicesTable.findFirst({ where: eq(devicesTable.dongle_id, req.params.dongleId) })
  if (!device) throw new NotFoundError('Device not found')

  // superuser
  if (identity.user.superuser) return { ...ctx, request, identity, device, permission: 'owner' as const }

  // user
  const deviceUser = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.user_id, identity.id), eq(deviceUsersTable.dongle_id, req.params.dongleId)),
  })
  if (!deviceUser) throw new ForbiddenError('No access to device')

  return { ...ctx, request, identity, device, permission: deviceUser.permission }
})

export const athenaMiddleware = createMiddleware(async (req: { params: { dongleId: string } }, { identity, request, ...ctx }) => {
  if (!identity) throw new UnauthorizedError('Authentication required')
  if (identity.type === 'device') throw new ForbiddenError('Cant use athena with device key')

  const device = await db.query.devicesTable.findFirst({ where: eq(devicesTable.dongle_id, req.params.dongleId) })
  if (!device) throw new NotFoundError('Device not found')

  // superuser
  if (identity.user.superuser) return { ...ctx, request, identity, device, permission: 'owner' as const }

  // user
  const deviceUser = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.user_id, identity.id), eq(deviceUsersTable.dongle_id, req.params.dongleId)),
  })
  if (!deviceUser) throw new ForbiddenError('No access to device')
  if (deviceUser.permission !== 'owner') throw new ForbiddenError('Has to be owner')

  return { ...ctx, request, identity, device, permission: deviceUser.permission }
})

/**
 * Checks if route is public, has valid signature, or user has access to the requested route
 */
export const routeMiddleware = createMiddleware(
  async (req: { params: { routeName: string; sig?: string }; query?: { sig?: string } }, { identity, ...ctx }) => {
    const [dongleId, routeId] = decodeURIComponent(req.params.routeName).split('|')
    if (!dongleId || !routeId) throw new NotFoundError('Invalid route name')

    const route = await aggregateRoute(dongleId, routeId, ctx.origin)
    if (!route) throw new NotFoundError('Route not found')

    // Check signature access
    const sig = req.params.sig ?? req.query?.sig
    if (sig) {
      const expectedKey = `${dongleId}/${routeId}`
      const signature = verify<RouteSignature>(sig, env.JWT_SECRET)
      if (signature && signature.key === expectedKey) {
        return { ...ctx, identity, route, permission: signature.permission }
      }
    }

    // Check authenticated access first (so owners can modify public routes)
    if (identity) {
      if (identity.type === 'device') {
        if (identity.device.dongle_id === dongleId) return { ...ctx, identity, route, permission: 'owner' as const }
      } else {
        // superuser
        if (identity.user.superuser) return { ...ctx, identity, route, permission: 'owner' as const }

        // user
        const deviceUser = await db.query.deviceUsersTable.findFirst({
          where: and(eq(deviceUsersTable.user_id, identity.user.id), eq(deviceUsersTable.dongle_id, dongleId)),
          with: { device: true },
        })
        if (deviceUser) return { ...ctx, identity, route, permission: deviceUser.permission }
      }
    }

    // Public routes are accessible without auth (or if authenticated but not owner)
    if (route.is_public) return { ...ctx, identity, route, permission: 'read_access' as const }

    // No access
    if (!identity) throw new UnauthorizedError('Authentication required')
    throw new ForbiddenError('No access to route')
  },
)

/**
 * Checks if sig or user or device has access to specific key
 * Keys are expected in format: dongleId/routeId/segment/file
 */
export const dataMiddleware = createMiddleware(async (req: { params: { _key: string }; query: { sig?: string } }, { identity, ...ctx }) => {
  const rawKeys = new URL(ctx.request.url).pathname.replace('/connectdata/', '').replaceAll('%2F', '/').replaceAll('*', '').trim().split('/').filter(Boolean)
  const key = rawKeys.join('/')

  // Keys must start with dongleId/
  const dongleId = key.split('/')[0]
  if (!dongleId) throw new BadRequestError('Invalid key format')

  // signature
  if (req.query.sig) {
    const signature = verify<DataSignature>(req.query.sig, env.JWT_SECRET)
    if (!signature || signature.key !== key) throw new ForbiddenError('Invalid signature')
    const device = await db.query.devicesTable.findFirst({ where: eq(devicesTable.dongle_id, dongleId) })
    if (!device) throw new NotFoundError('Device not found')
    return { ...ctx, identity, permission: signature.permission, key, device }
  }

  if (!identity) throw new UnauthorizedError('Authentication required')

  // device
  if (identity.type === 'device') {
    if (identity.device.dongle_id !== dongleId) throw new ForbiddenError('Device mismatch')
    return { ...ctx, identity, permission: 'owner' as const, device: identity.device, key }
  }

  const device = await db.query.devicesTable.findFirst({ where: eq(devicesTable.dongle_id, dongleId) })
  if (!device) throw new NotFoundError('Device not found')
  // superuser
  if (identity.user.superuser) return { ...ctx, identity, permission: 'owner' as const, key, device }

  // user
  const deviceUser = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.dongle_id, dongleId), eq(deviceUsersTable.user_id, identity.user.id)),
  })
  if (!deviceUser) throw new ForbiddenError('No access to data')

  return { ...ctx, identity, permission: deviceUser.permission, key, device }
})
