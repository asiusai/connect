import { contract } from '../../connect/src/api/contract'
import { tsr } from '../tsr'

export const auth = tsr.router(contract.auth, {
  // TODO
} as any)
