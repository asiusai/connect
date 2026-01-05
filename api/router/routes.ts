import { contract } from '../../connect/src/api/contract'
import { NotImplementedError, tsr } from '../common'
import { deviceMiddleware, routeMiddleware } from '../middleware'

export const routes = tsr.router(contract.routes, {
  allRoutes: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  files: routeMiddleware(async () => {
    throw new NotImplementedError()
  }),
  get: routeMiddleware(async () => {
    throw new NotImplementedError()
  }),
  preserve: routeMiddleware(async () => {
    throw new NotImplementedError()
  }),
  preserved: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  routesSegments: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
  setPublic: routeMiddleware(async () => {
    throw new NotImplementedError()
  }),
  shareSignature: routeMiddleware(async () => {
    throw new NotImplementedError()
  }),
  unPreserve: routeMiddleware(async () => {
    throw new NotImplementedError()
  }),
})
