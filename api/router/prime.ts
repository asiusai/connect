import { contract } from '../../connect/src/api/contract'
import { NotImplementedError, tsr } from '../common'
import { authenticatedMiddleware } from '../middleware'

export const prime = tsr.router(contract.prime, {
  cancel: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  getCheckout: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  getPortal: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  getSession: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  info: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  status: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
})
