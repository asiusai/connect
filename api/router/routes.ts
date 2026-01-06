import { and, eq, gt, lt } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { NotImplementedError, tsr } from '../common'
import { db } from '../db/client'
import { deviceMiddleware } from '../middleware'
import { RouteData, routesTable } from '../db/schema'
import { Route } from '../../connect/src/types'

const routeDataToRoute = async (data: RouteData): Promise<Route> => {
  return { ...data }
}
export const routes = tsr.router(contract.routes, {
  allRoutes: deviceMiddleware(async ({ query }, { device }) => {
    const routes = await db.query.routesTable.findMany({
      where: and(eq(routesTable.dongle_id, device.dongle_id), query.created_before ? lt(routesTable.create_time, new Date(query.created_before)) : undefined),
      limit: query.limit,
    })
    return { status: 200, body: await Promise.all(routes.map((route) => routeDataToRoute(route))) }
  }),
  preserved: deviceMiddleware(async (_, { device }) => {
    const routes = await db.query.routesTable.findMany({
      where: and(eq(routesTable.dongle_id, device.dongle_id), eq(routesTable.is_preserved, true)),
    })

    return { status: 200, body: await Promise.all(routes.map((route) => routeDataToRoute(route))) }
  }),
  routesSegments: deviceMiddleware(async ({ query }, { device }) => {
    throw new NotImplementedError()
  }),
})
