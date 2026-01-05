import { contract } from '../../connect/src/api/contract'
import { NotImplementedError, tsr } from '../common'
import { authenticatedMiddleware, unAuthenticatedMiddleware } from '../middleware'

export const auth = tsr.router(contract.auth, {
  auth: unAuthenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  appleRedirect: unAuthenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  githubRedirect: unAuthenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  googleRedirect: unAuthenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
  me: authenticatedMiddleware(async () => {
    throw new NotImplementedError()
  }),
})
