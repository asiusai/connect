import { contract } from '../../connect/src/api/contract'
import { tsr } from '../helpers'

export const auth = tsr.router(contract.auth, {
  // TODO
} as any)
