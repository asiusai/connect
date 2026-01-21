import { contract } from '../../shared/contract'
import { tsr } from '../common'
import { athenaMiddleware } from '../middleware'
import { sendToDevice } from '../ws'

export const athena = tsr.router(contract.athena, {
  athena: athenaMiddleware(async ({ body }, { device }) => {
    const response = await sendToDevice(device.dongle_id, body.method, body.params, body.params?.timeoutut)

    if (response.queued) return { status: 202, body: { queued: true, result: response.result } }

    return { status: 200, body: response }
  }),
})
