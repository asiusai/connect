import { contract } from '../../connect/src/api/contract'
import { tsr } from '../tsr'

export const files = tsr.router(contract.files, {
  // TODO
} as any)
