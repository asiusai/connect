import { contract } from '../../connect/src/api/contract'
import { verify } from '../../connect/src/utils/helpers'
import { BadRequestError, tsr } from '../helpers'

export const device = tsr.router(contract.device, {
  register: async ({ query }) => {
    const data = verify<{ register: boolean; exp: number }>(query.register_token, query.public_key)
    if (!data?.register) throw new BadRequestError()
    // TODO
    const dongleId  =  "3232323423423423"
    return { status: 200, body: { dongle_id: dongleId } }
  },
  getUploadUrl: async () => {
    return { status: 200, body: { headers: {}, url: '' } }
  },
})
