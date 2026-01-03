import { contract } from '../../connect/src/api/contract'
import { tsr } from '../helpers'

export const files = tsr.router(contract.files, {
  // TODO
} as any)
