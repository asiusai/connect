import { contract } from '../../shared/contract'
import { tsr } from '../common'
import { athena } from './athena'
import { devices } from './devices'
import { prime } from './prime'
import { auth } from './auth'
import { routes } from './routes'
import { device } from './device'
import { route } from './route'
import { users } from './users'
import { admin } from './admin'

export const router = tsr.router(contract, {
  auth,
  devices,
  device,
  routes,
  route,
  users,
  athena,
  prime,
  data: {} as any,
  admin,
})
