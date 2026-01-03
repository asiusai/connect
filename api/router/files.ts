import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'

export const files = tsr.router(contract.files, {
  // TODO
} as any)
