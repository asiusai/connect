import { and, eq, lt, desc } from 'drizzle-orm'
import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'
import { db } from '../db/client'
import { deviceMiddleware } from '../middleware'
import { segmentsTable } from '../db/schema'
import { AggregatedRoute, aggregateRoute, routeToSegment } from '../helpers'

const getDistinctRoutes = async (dongleId: string, origin: string, options?: { limit?: number; createdBefore?: number; preservedOnly?: boolean }) => {
  const conditions = [eq(segmentsTable.dongle_id, dongleId)]
  if (options?.createdBefore) conditions.push(lt(segmentsTable.create_time, options.createdBefore))

  const routeIds = await db
    .selectDistinct({ route_id: segmentsTable.route_id })
    .from(segmentsTable)
    .where(and(...conditions))
    .orderBy(desc(segmentsTable.create_time))
    .limit(options?.limit ?? 100)

  const routes: AggregatedRoute[] = []
  for (const { route_id } of routeIds) {
    const route = await aggregateRoute(dongleId, route_id, origin)
    if (route) {
      if (options?.preservedOnly && !route.is_preserved) continue
      routes.push(route)
    }
  }
  return routes
}

export const routes = tsr.router(contract.routes, {
  allRoutes: deviceMiddleware(async ({ query }, { device, origin }) => {
    const routes = await getDistinctRoutes(device.dongle_id, origin, {
      limit: query.limit,
      createdBefore: query.created_before,
    })
    return { status: 200, body: routes }
  }),
  preserved: deviceMiddleware(async (_, { device, origin }) => {
    const routes = await getDistinctRoutes(device.dongle_id, origin, { preservedOnly: true })
    return { status: 200, body: routes }
  }),
  routesSegments: deviceMiddleware(async ({ query }, { device, origin }) => {
    let routes: AggregatedRoute[]

    if (query.route_str) {
      const [dongleId, routeId] = query.route_str.split('|')
      if (dongleId !== device.dongle_id) {
        return { status: 200, body: [] }
      }
      const route = await aggregateRoute(dongleId, routeId, origin)
      routes = route ? [route] : []
    } else {
      routes = await getDistinctRoutes(device.dongle_id, origin, { limit: query.limit })

      if (query.start || query.end) {
        routes = routes.filter((r) => {
          if (query.start && r.create_time < query.start) return false
          if (query.end && r.create_time > query.end) return false
          return true
        })
      }
    }

    return { status: 200, body: routes.map(routeToSegment) }
  }),
})
