import { contract } from '../../connect/src/api/contract'
import { ForbiddenError, tsr } from '../common'
import { db } from '../db/client'
import { routesTable } from '../db/schema'
import { routeMiddleware } from '../middleware'
import { Files } from '../../connect/src/types'
import { mkv } from '../mkv'
import { createDataSignature, createRouteSignature } from '../helpers'

export const route = tsr.router(contract.route, {
  get: routeMiddleware(async (_, { route }) => {
    return { status: 200, body: route }
  }),
  derived: routeMiddleware(async ({ params }, { route, origin, responseHeaders }) => {
    const routeId = route.fullname.split('|')[1]
    const key = `${route.dongle_id}/${routeId}/${params.segment}/${params.file}`
    const segSig = createDataSignature(key, 'read_access', 60)
    responseHeaders.set('Location', `${origin}/connectdata/${key}?sig=${segSig}`)
    return { status: 302, body: undefined }
  }),
  setPublic: routeMiddleware(async ({ body }, { route, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')
    const routeId = route.fullname.split('|')[1]

    await db
      .insert(routesTable)
      .values({ dongle_id: route.dongle_id, route_id: routeId, is_public: body.is_public })
      .onConflictDoUpdate({ target: [routesTable.dongle_id, routesTable.route_id], set: { is_public: body.is_public } })

    return { status: 200, body: { ...route, is_public: body.is_public } }
  }),
  preserve: routeMiddleware(async (_, { route, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')
    const routeId = route.fullname.split('|')[1]

    await db
      .insert(routesTable)
      .values({ dongle_id: route.dongle_id, route_id: routeId, is_preserved: true })
      .onConflictDoUpdate({ target: [routesTable.dongle_id, routesTable.route_id], set: { is_preserved: true } })

    return { status: 200, body: { success: 1 } }
  }),
  unPreserve: routeMiddleware(async (_, { route, permission }) => {
    if (permission !== 'owner') throw new ForbiddenError('Owner access required')
    const routeId = route.fullname.split('|')[1]

    await db
      .insert(routesTable)
      .values({ dongle_id: route.dongle_id, route_id: routeId, is_preserved: false })
      .onConflictDoUpdate({ target: [routesTable.dongle_id, routesTable.route_id], set: { is_preserved: false } })

    return { status: 200, body: { success: 1 } }
  }),
  shareSignature: routeMiddleware(async (_, { route }) => {
    const routeId = route.fullname.split('|')[1]
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const sig = createRouteSignature(route.dongle_id, routeId, 'read_access', 24 * 60 * 60)

    return { status: 200, body: { exp, sig } }
  }),
  files: routeMiddleware(async (_, { route, origin }) => {
    const routeId = route.fullname.split('|')[1]
    const prefix = `${route.dongle_id}/${routeId}`
    const existingFiles = await mkv.listKeys(prefix)

    const files: Files = {
      cameras: [],
      dcameras: [],
      ecameras: [],
      logs: [],
      qcameras: [],
      qlogs: [],
    }

    const fileMap: Record<string, keyof Files> = {
      'fcamera.hevc': 'cameras',
      'dcamera.hevc': 'dcameras',
      'ecamera.hevc': 'ecameras',
      'rlog.zst': 'logs',
      'qcamera.ts': 'qcameras',
      'qlog.zst': 'qlogs',
    }

    // Files are stored as: dongleId/routeId/segment/filename
    for (const file of existingFiles) {
      const filename = file.split('/').pop()
      if (!filename) continue

      const fileType = fileMap[filename]
      if (!fileType) continue

      const key = file.startsWith('/') ? file.slice(1) : file
      const segSig = createDataSignature(key, 'read_access', 24 * 60 * 60)
      files[fileType].push(`${origin}/connectdata/${key}?sig=${segSig}`)
    }

    return { status: 200, body: files }
  }),
})
