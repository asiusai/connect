import { contract } from '../../connect/src/api/contract'
import { NotImplementedError, tsr } from '../common'
import { deviceMiddleware } from '../middleware'

export const athena = tsr.router(contract.athena, {
  athena: deviceMiddleware(async () => {
    throw new NotImplementedError()
  }),
})
