import { contract } from '../../connect/src/api/contract'
import { tsr } from '../helpers'

export const devices = tsr.router(contract.devices, {
  // TODO
} as any)
