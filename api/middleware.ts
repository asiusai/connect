import { and, eq } from 'drizzle-orm'
import { Context, UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from './common'
import { db } from './db/client'
import { deviceUsersTable, routesTable } from './db/schema'

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

export const authenticatedMiddleware = createMiddleware(async (_, ctx) => {
  const identity = ctx.identity
  if (!identity) throw new UnauthorizedError()
  return { ...ctx, identity }
})

export const unAuthenticatedMiddleware = createMiddleware(async (_, ctx) => {
  const identity = ctx.identity
  if (identity) throw new BadRequestError()
  return { ...ctx }
})

/**
 * Checks if device or user has access to the requested device
 */
export const deviceMiddleware = createMiddleware(async (req: { params: { dongleId: string } }, ctx) => {
  const identity = ctx.identity
  if (!identity) throw new UnauthorizedError()
  if (identity.type === 'device') {
    if (identity.device.dongle_id !== req.params.dongleId) throw new ForbiddenError()
    return { ...ctx, identity, device: identity.device, permission: 'owner' }
  }

  const deviceUser = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.user_id, identity.id), eq(deviceUsersTable.dongle_id, req.params.dongleId)),
    with: { device: true },
  })
  if (!deviceUser) throw new ForbiddenError()

  return { ...ctx, identity, device: deviceUser.device, permission: deviceUser.permission }
})

/**
 * Checks if route is public or user has access to the requested route
 */
export const routeMiddleware = createMiddleware(async (req: { params: { routeName: string } }, ctx) => {
  const identity = ctx.identity
  if (!identity) throw new UnauthorizedError()
  if (identity.type === 'device') throw new ForbiddenError()

  const route = await db.query.routesTable.findFirst({ where: eq(routesTable.fullname, req.params.routeName) })
  if (!route) throw new NotFoundError()
  if (route.is_public) return { ...ctx, identity, route, permission: 'read_access' }

  const deviceUser = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.user_id, identity.user.id), eq(deviceUsersTable.dongle_id, route.dongle_id)),
    with: { device: true },
  })
  if (!deviceUser) throw new ForbiddenError()

  return { ...ctx, identity, device: deviceUser.device, permission: deviceUser.permission }
})

/**
 * Checks if user or device has access to specific key
 */
export const dataMiddleware = createMiddleware(async (_: { params: { _key: string } }, ctx) => {
  const keys = new URL(ctx.request.url).pathname.replace('/connectdata/', '').replaceAll('%2F', '/').replaceAll('*', '').trim().split('/').filter(Boolean)
  const key = keys.join('/')

  // We only support keys that prefix with /dongleId/
  const dongleId = keys[0]
  if (!dongleId) throw new BadRequestError(`No dongleId`)

  const identity = ctx.identity

  // if (dongleId === 'test') return { ...ctx, identity, permission: 'owner', key, keys }

  if (!identity) throw new UnauthorizedError()
  if (identity.type === 'device') {
    if (identity.device.dongle_id !== dongleId) throw new ForbiddenError()
    return { ...ctx, identity, permission: 'owner' as const, device: identity.device, key, keys }
  }

  const deviceUser = await db.query.deviceUsersTable.findFirst({
    where: and(eq(deviceUsersTable.dongle_id, dongleId), eq(deviceUsersTable.user_id, identity.user.id)),
    with: { device: true },
  })
  if (!deviceUser) throw new ForbiddenError()

  return { ...ctx, identity, permission: deviceUser.permission, key, keys, device: deviceUser.device }
})
