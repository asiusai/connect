import { contract } from '../../shared/contract'
import { NotImplementedError, tsr } from '../common'
import { userMiddleware } from '../middleware'

export const prime = tsr.router(contract.prime, {
  cancel: userMiddleware(async () => {
    throw new NotImplementedError('Prime not available')
  }),
  getCheckout: userMiddleware(async () => {
    throw new NotImplementedError('Prime not available')
  }),
  getPortal: userMiddleware(async () => {
    throw new NotImplementedError('Prime not available')
  }),
  getSession: userMiddleware(async () => {
    throw new NotImplementedError('Prime not available')
  }),
  info: userMiddleware(async () => {
    throw new NotImplementedError('Prime not available')
  }),
  status: userMiddleware(async () => {
    throw new NotImplementedError('Prime not available')
  }),
})
