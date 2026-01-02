import { contract } from '../../connect/src/api/contract'
import { tsr } from '../tsr'
import { athena } from './athena'
import { devices } from './devices'
import { prime } from './prime'
import { auth } from './auth'
import { routes } from './routes'
import { files } from './files'

export const router = tsr.router(contract, {
  athena,
  devices,
  prime,
  auth,
  routes,
  files,
})
