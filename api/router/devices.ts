import { contract } from '../../connect/src/api/contract'
import { tsr } from '../tsr'

export const devices = tsr.router(contract.devices, {
  // TODO
} as any)
