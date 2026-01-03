import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'

export const auth = tsr.router(contract.auth, {
  // TODO
} as any)
