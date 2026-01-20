import { Client } from 'ssh2'
import { Duplex } from 'stream'
import { SSH_PRIVATE_KEY, callAthena, HIGH_WATER_MARK, MAX_BUFFER_SIZE, Session, sessions } from './common'

export const open = async (session: Session) => {
  if (!session.browser) throw new Error('No browser')

  const auth = session.auth
  console.log(`[${auth.provider}/${auth.dongleId}] browser connected`)

  const res = await callAthena(auth, session.id)
  if (res.error) {
    console.error(`[${auth.provider}/${auth.dongleId}] athena error:`, res.error)
    session.browser.send(`\r\n\x1b[31mError: ${res.error}\x1b[0m\r\n`)
    session.browser.close()
    sessions.delete(session.id)
    return
  }
  console.log(`[${auth.provider}/${auth.dongleId}] waiting for device...`)
  session.browser.send(`\r\n\x1b[33mConnecting to device...\x1b[0m\r\n`)

  // Timeout if device doesn't connect within 30 seconds
  setTimeout(() => {
    if (session.device) return
    console.log(`[${auth.provider}/${auth.dongleId}] device connection timeout`)
    session.browser?.send(`\r\n\x1b[31mDevice connection timeout\x1b[0m\r\n`)
    session.browser?.close()
    sessions.delete(session.id)
  }, 30000)
}

export const message = (session: Session, data: Buffer) => {
  if (!session.browser) throw new Error('No browser')
  if (session.shellStream) {
    session.shellStream.write(data)
    return
  }

  if (session.bufferSize + data.length > MAX_BUFFER_SIZE) {
    console.error(`[${session.auth.provider}/${session.auth.dongleId}] browser buffer overflow, closing`)
    session.browser.close()
    sessions.delete(session.id)
    return
  }
  session.buffer.push(data)
  session.bufferSize += data.length
}

export const close = (session: Session) => {
  console.log(`[${session.auth.provider}/${session.auth.dongleId}] browser disconnected`)
  session.shellStream?.close()
  session.sshClient?.end()
  session.device?.close()
  sessions.delete(session.id)
}

export const onDeviceOpen = async (session: Session) => {
  if (!session.browser) throw new Error('No browser!')
  if (!session.device) throw new Error('No device!')

  session.browser.send(`\x1b[33mDevice connected, authenticating...\x1b[0m\r\n`)

  // Create a duplex stream that bridges WebSocket and SSH client
  let writeBuffer: Buffer[] = []
  let flushScheduled = false
  const flushBuffer = () => {
    if (writeBuffer.length > 0) {
      session.device!.send(Buffer.concat(writeBuffer))
      writeBuffer = []
    }
    flushScheduled = false
  }

  const wsStream = new Duplex({
    read: () => {},
    write: (chunk, _encoding, callback) => {
      writeBuffer.push(chunk)
      if (!flushScheduled) {
        flushScheduled = true
        setImmediate(flushBuffer)
      }
      callback()
    },
  })

  session.wsStream = wsStream

  const client = new Client()
  session.sshClient = client

  client.on('ready', () => {
    console.log(`[${session.auth.provider}/${session.auth.dongleId}] SSH authenticated`)
    session.browser?.send(`\x1b[32mAuthenticated!\x1b[0m\r\n\r\n`)

    client.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        session.browser?.send(`\x1b[31mShell error: ${err.message}\x1b[0m\r\n`)
        session.browser?.close()
        return
      }

      session.shellStream = stream

      // Send buffered input from browser
      for (const data of session.buffer) stream.write(data)
      session.buffer = []
      session.bufferSize = 0

      // Shell -> Browser with backpressure
      stream.on('data', (data: Buffer) => {
        if (!session.browser) return
        const bufferedAmount = session.browser.getBufferedAmount?.() ?? 0
        if (bufferedAmount > HIGH_WATER_MARK) {
          if (!session.paused) {
            session.paused = true
            stream.pause()
          }
        }
        session.browser.send(data)
      })

      stream.on('close', () => {
        console.log(`[${session.auth.provider}/${session.auth.dongleId}] shell closed`)
        session.browser?.close()
      })
    })
  })

  client.on('error', (err) => {
    console.error(`[${session.auth.provider}/${session.auth.dongleId}] SSH error:`, err.message)
    session.browser?.send(`\x1b[31mSSH error: ${err.message}\x1b[0m\r\n`)
    session.browser?.close()
  })

  client.on('keyboard-interactive', (_name, _instructions, _lang, _prompts, finish) => finish([]))

  client.connect({
    sock: wsStream,
    username: 'comma',
    privateKey: SSH_PRIVATE_KEY,
    hostVerifier: () => true,
    readyTimeout: 60000,
  })
}
