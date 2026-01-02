import { contract } from '../../connect/src/api/contract'
import { tsr } from '../tsr'

export const routes = tsr.router(contract.routes, {
  // TODO
} as any)
