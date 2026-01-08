import { contract } from '../../connect/src/api/contract'
import { tsr } from '../common'
import { deviceMiddleware } from '../middleware'
import { sendToDevice } from '../ws'
import { createSshSession } from '../ssh'

export const ssh = tsr.router(contract.ssh, {
  createSession: deviceMiddleware(async (_, { device, origin }) => {
    const sessionId = createSshSession(device.dongle_id)
    const wsUrl = `${origin.replace('http', 'ws')}/ssh/${sessionId}`

    // Tell device to connect to the SSH relay WebSocket
    const response = await sendToDevice(device.dongle_id, 'startLocalProxy', {
      remote_ws_uri: wsUrl,
      local_port: 8022, // Device maps 8022 -> 22 for SSH
    })

    if (response.error) {
      return { status: 400, body: response.error.message || 'Failed to start SSH proxy on device' }
    }

    return {
      status: 200,
      body: {
        sessionId,
        wsUrl,
      },
    }
  }),
})
