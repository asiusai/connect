import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'
import { athena } from './athena'
import { devices } from './devices'
import { prime } from './prime'
import { auth } from './auth'
import { routes } from './routes'
import { data } from './data'

export const router = tsr.router(contract, {
  athena,
  devices,
  prime,
  auth,
  routes,
  data,
})
