import { Server, utils } from 'ssh2'
import { sendToDevice } from './ws'
import { randomId } from './common'
import { sessions } from './ssh'

const hostKey = process.env.SSH_HOST_KEY || utils.generateKeyPairSync('ed25519').private

// Parse authorized_keys format into public key blobs for comparison
const parseAuthorizedKeys = (keys: string): string[] => {
  return keys
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.trim().split(' ')
      return parts.length >= 2 ? parts[1] : '' // base64 blob
    })
    .filter(Boolean)
}

export const startSshServer = (port = 2222) => {
  const server = new Server({ hostKeys: [hostKey] }, (client) => {
    let dongleId = ''
    let authorizedKeys: string[] = []

    client.on('authentication', async (ctx) => {
      dongleId = ctx.username.replace('comma-', '').replace('asius-', '')

      if (ctx.method === 'publickey') {
        // Fetch authorized keys from device on first pubkey attempt
        if (authorizedKeys.length === 0) {
          const res = await sendToDevice(dongleId, 'getSshAuthorizedKeys', {}, 10000)
          if (res.result) {
            authorizedKeys = parseAuthorizedKeys(res.result)
          }
          if (authorizedKeys.length === 0) {
            console.log(`SSH proxy: ${dongleId} has no authorized keys`)
            return ctx.reject(['publickey'])
          }
        }

        // Verify the public key - compare base64 blobs
        const clientKeyBlob = ctx.key?.data.toString('base64')
        if (clientKeyBlob && authorizedKeys.includes(clientKeyBlob)) {
          if (ctx.signature) {
            // Key + signature = full auth
            ctx.accept()
          } else {
            // Key only = client checking if key is acceptable
            ctx.accept()
          }
        } else {
          ctx.reject(['publickey'])
        }
      } else {
        ctx.reject(['publickey'])
      }
    })

    client.on('ready', () => {
      console.log(`SSH proxy: ${dongleId} authenticated`)

      client.on('tcpip', (accept) => {
        const channel = accept()
        const sessionId = randomId()
        const origin = process.env.API_ORIGIN || 'wss://api.asius.ai'

        sessions.set(sessionId, {
          dongleId,
          createdAt: Date.now(),
          clientBuffer: [],
          deviceBuffer: [],
          sshChannel: channel,
        })

        console.log(`SSH proxy: session ${sessionId} for ${dongleId}`)

        sendToDevice(dongleId, 'startLocalProxy', {
          remote_ws_uri: `${origin}/ssh/${sessionId}`,
          local_port: 8022,
        }, 15000).then((res) => {
          if (res.error) {
            console.error(`SSH proxy: device error for ${sessionId}:`, res.error)
            channel.stderr.write(`Device error: ${res.error.message || 'offline'}\n`)
            channel.close()
          }
        })

        channel.on('close', () => {
          const session = sessions.get(sessionId)
          if (session?.device) session.device.close()
          sessions.delete(sessionId)
        })
      })
    })

    client.on('error', (err) => {
      console.error('SSH proxy error:', err.message)
    })
  })

  server.listen(port, '0.0.0.0', () => {
    console.log(`SSH proxy listening on port ${port}`)
  })

  return server
}
