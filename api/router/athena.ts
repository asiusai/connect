import { contract } from '../../connect/src/api/contract'
import { tsr } from '../tsr'

export const athena = tsr.router(contract.athena, {
  // TODO
} as any)
