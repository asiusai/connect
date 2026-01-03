import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'

export const routes = tsr.router(contract.routes, {
  // TODO
} as any)
