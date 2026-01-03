import { $ } from 'bun'
import { existsSync } from 'fs'
import { env } from './env'

export const startMkv = async () => {
  await $`mkdir -p ${env.MKV_VOLUMES.join(' ')} ${env.MKV_DB}`

  // Build mkv if needed
  if (!existsSync('../minikeyvalue/src/mkv')) await $`cd ../minikeyvalue/src && go build -o mkv`

  const volumes = env.MKV_VOLUMES.map((vol, i) => {
    const PORT = String(env.MKV_PORT + 1 + i)
    Bun.spawn(['../minikeyvalue/volume', `${vol}/`], { env: { ...process.env, PORT } })
    return `localhost:${PORT}`
  })

  Bun.spawn([
    '../minikeyvalue/src/mkv',
    '-volumes',
    volumes.join(','),
    '-db',
    env.MKV_DB,
    '-replicas',
    String(volumes.length),
    '--port',
    String(env.MKV_PORT),
    'server',
  ])

  console.log(`MKV started with ${volumes.length} volumes`)
}
