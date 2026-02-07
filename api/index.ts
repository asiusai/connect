import { $ } from 'bun'
import os from 'os'
import { restoreFromR2, startBackupSchedule } from './db/backup'
import type { WebSocketData } from './ws'
import type { ProviderInfo } from '../shared/provider'
await restoreFromR2()

// need to import like this cause otherwise the database get's created on import
const { handler } = await import('./handler')
const { websocket } = await import('./ws')
const { startQueueWorker } = await import('./processing/queue')
const { env } = await import('./env')

const server = Bun.serve<WebSocketData>({
  port: env.PORT,
  hostname: '0.0.0.0',
  idleTimeout: 255,
  websocket,
  fetch: handler,
})

console.log(`Started server on http://${server.hostname}:${server.port}`)

const getLocalIP = () => {
  for (const iface of Object.values(os.networkInterfaces()).flat()) {
    if (iface?.family === 'IPv4' && !iface.internal) return iface.address
  }
  return '127.0.0.1'
}
const ip = getLocalIP()
let host = `${ip}:${server.port}`
let url = `http://${host}`

if (env.TAILSCALE) {
  await $`pkill -f 'tailscale funnel'`.quiet().nothrow()

  const funnel = Bun.spawn(['tailscale', 'funnel', String(server.port)], { stdout: 'inherit', stderr: 'inherit' })

  await new Promise((res) => setTimeout(res, 5_000))
  const res = await $`tailscale funnel status --json`.quiet().nothrow().json()
  host = Object.keys((Object.values(res.Foreground).findLast((x) => x) as any)?.Web)[0].replace(':443', '')
  url = `https://${host}`

  process.on('SIGINT', () => {
    funnel.kill()
    process.exit(0)
  })
}

const providerInfo: ProviderInfo = {
  id: env.NAME,
  title: `${env.NAME} connect`,
  favicon: '/asius-favicon.svg',

  apiUrl: url,
  athenaUrl: url,
  authUrl: url,
  deviceHost: host,

  googleClientId: env.GOOGLE_CLIENT_ID,
  githubClientId: env.GITHUB_CLIENT_ID,

  googleScope: 'user:email',
  storingMP4: true,
}

console.log(`Connect URL: ${env.CONNECT_URL}/add-provider?info=${btoa(JSON.stringify(providerInfo))}`)

startQueueWorker()
startBackupSchedule()
