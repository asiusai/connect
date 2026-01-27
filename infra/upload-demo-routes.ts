import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { execSync } from 'child_process'
import { createPublicKey } from 'crypto'
import jwt from 'jsonwebtoken'
import { getProvider, DEFAULT_PROVIDER } from '../shared/provider'

const CONNECT_DATA_DIR = join(dirname(import.meta.path), '../connect-data')
const JWT_ALGORITHM = 'RS256' as const

type UploadInfo = { url: string; headers?: Record<string, string> }

const provider = getProvider(DEFAULT_PROVIDER)

const getPrivateKey = () => {
  const result = execSync('dotenv -- pulumi config get asius:demoDevicePrivateKey', {
    cwd: dirname(import.meta.path),
    encoding: 'utf-8',
  })
  return result.trim()
}

const getPublicKey = (key: string) => createPublicKey({ key, format: 'pem' }).export({ type: 'spki', format: 'pem' }) as string

const getUploadInfo = async (path: string, dongleId: string, deviceToken: string): Promise<UploadInfo> => {
  const res = await fetch(`${provider.apiUrl}/v1.4/${dongleId}/upload_url/?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `JWT ${deviceToken}` },
  })
  if (!res.ok) throw new Error(`Get upload URL failed: ${await res.text()}`)
  const data = await res.json()
  return { url: data.url, headers: data.headers }
}

const upload = async (info: UploadInfo, content: ArrayBuffer | string) => {
  const res = await fetch(info.url, {
    method: 'PUT',
    body: content,
    headers: info.headers ?? { 'Content-Type': 'application/octet-stream' },
  })
  if (!res.ok && res.status !== 403) throw new Error(`Upload failed: ${res.status}`)
}

const registerOrGetDevice = async (privateKey: string, publicKey: string): Promise<string> => {
  const registerToken = jwt.sign({ register: true }, privateKey, { algorithm: JWT_ALGORITHM, expiresIn: '1h' })
  const params = new URLSearchParams({
    imei: provider.demoDongleId,
    imei2: `${provider.demoDongleId}-2`,
    serial: provider.demoDongleId,
    public_key: publicKey,
    register_token: registerToken,
  })

  const res = await fetch(`${provider.apiUrl}/v2/pilotauth/?${params}`, { method: 'POST' })
  if (res.ok) return (await res.json()).dongle_id

  const text = await res.text()
  if (text.includes('already registered') || res.status === 409) {
    console.log('Device already registered, using existing dongle_id')
    const data = JSON.parse(text.split('dongle_id: ')[1]?.split('"')[0] || '{}')
    if (data) return data
  }
  throw new Error(`Register failed: ${text}`)
}

const main = async () => {
  console.log(`Target: ${provider.name} (${provider.apiUrl})`)

  console.log('Reading private key from Pulumi config...')
  const privateKey = getPrivateKey()
  const publicKey = getPublicKey(privateKey)

  console.log('Registering device...')
  let dongleId: string
  try {
    dongleId = await registerOrGetDevice(privateKey, publicKey)
    if (dongleId !== provider.demoDongleId) console.error(`Dongle id is ${dongleId}, not ${provider.demoDongleId}`)
  } catch {
    console.log('Registration failed, trying to use existing device...')
    dongleId = provider.demoDongleId
  }
  console.log(`Dongle ID: ${dongleId}`)

  const deviceToken = jwt.sign({ identity: dongleId, nbf: Math.floor(Date.now() / 1000) }, privateKey, {
    algorithm: JWT_ALGORITHM,
    expiresIn: '1h',
  })

  const routes = await readdir(CONNECT_DATA_DIR)
  const routeDirs = routes.filter((r) => r.startsWith('0'))

  for (const routeId of routeDirs) {
    console.log(`\nUploading route: ${routeId}`)
    const routeDir = join(CONNECT_DATA_DIR, routeId)
    const segments = await readdir(routeDir)
    const segmentDirs = segments.filter((s) => /^\d+$/.test(s)).sort((a, b) => Number(a) - Number(b))

    for (const segment of segmentDirs) {
      const segmentDir = join(routeDir, segment)
      const files = await readdir(segmentDir)

      const priority = ['qlog.zst', 'qcamera.ts']
      const sortedFiles = files.slice().sort((a, b) => {
        const aIdx = priority.findIndex((p) => a.endsWith(p))
        const bIdx = priority.findIndex((p) => b.endsWith(p))
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
        if (aIdx !== -1) return -1
        if (bIdx !== -1) return 1
        return 0
      })

      for (const filename of sortedFiles) {
        if (!filename.endsWith('qlog.zst') && !filename.endsWith('qcamera.ts') && !filename.endsWith('.hevc') && !filename.endsWith('rlog.zst')) continue

        const path = `${routeId}--${segment}/${filename}`
        console.log(`  Uploading: ${path}`)

        try {
          const uploadUrl = await getUploadInfo(path, dongleId, deviceToken)
          const fileContent = await readFile(join(segmentDir, filename))
          await upload(uploadUrl, fileContent.buffer.slice(fileContent.byteOffset, fileContent.byteOffset + fileContent.byteLength) as ArrayBuffer)
        } catch (e) {
          console.error(`    Failed: ${e}`)
        }
      }
    }
  }

  const pairToken = jwt.sign({ identity: dongleId, pair: true }, privateKey, { algorithm: JWT_ALGORITHM, expiresIn: '24h' })

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Pairing URL: ${provider.connectUrl}/pair?pair=${pairToken}`)
  console.log(`Device ID: ${dongleId}`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
