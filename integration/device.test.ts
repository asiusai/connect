import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import jwt from 'jsonwebtoken'
import { generateKeyPairSync } from 'crypto'
import { describe, test, expect, beforeAll } from 'bun:test'
import { DEFAULT_PROVIDER, DEFAULT_PROVIDERS } from '../shared/provider'

const EXAMPLE_DATA_DIR = join(dirname(import.meta.path), '../example-data')
const ROUTE_ID = '0000002c--d68dde99ca'
const SEGMENTS_COUNT = 3

const provider = DEFAULT_PROVIDERS[DEFAULT_PROVIDER]

const isKonik = provider.id === 'konik'

// RSA keys for device auth
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})
const jwtAlgorithm = 'RS256' as const

// Shared API helpers
type UploadInfo = { url: string; headers?: Record<string, string> }

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

const fetchUrl = async (url: string) => await fetch(url).then(async (res) => (res.ok ? await res.arrayBuffer() : null))

const apiGet = async (path: string, token?: string) => {
  const res = await fetch(`${provider.apiUrl}${path}`, { headers: token ? { Authorization: `JWT ${token}` } : {} })
  return { status: res.status, data: res.ok ? await res.json() : null }
}

const apiPatch = async (path: string, body: unknown, token?: string) => {
  const res = await fetch(`${provider.apiUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: res.ok ? await res.json() : null }
}

// Tests
describe(`Device Integration (${provider.id})`, () => {
  // Test state
  let dongleId: string
  let deviceToken: string
  let routeNameEncoded: string

  beforeAll(async () => {
    console.log(`\nTarget: ${provider.id} (${provider.apiUrl})`)

    // Register device
    const params = new URLSearchParams({
      imei: `test-${Date.now()}`,
      imei2: `test2-${Date.now()}`,
      serial: `serial-${Date.now()}`,
      public_key: publicKey,
      register_token: jwt.sign({ register: true }, privateKey, { algorithm: jwtAlgorithm, expiresIn: '1h' }),
    })
    const registerRes = await fetch(`${provider.apiUrl}/v2/pilotauth/?${params}`, { method: 'POST' })
    if (!registerRes.ok) throw new Error(`Register failed: ${await registerRes.text()}`)
    dongleId = (await registerRes.json()).dongle_id
    deviceToken = jwt.sign({ identity: dongleId, nbf: Math.floor(Date.now() / 1000) }, privateKey, { algorithm: jwtAlgorithm, expiresIn: '1h' })
    routeNameEncoded = encodeURIComponent(`${dongleId}|${ROUTE_ID}`)
    console.log(`Registered: ${dongleId}`)

    // Upload qlog/qcamera/hevc files from folder structure: routeId/segment/files
    const routeDir = join(EXAMPLE_DATA_DIR, ROUTE_ID)
    for (let segment = 0; segment < SEGMENTS_COUNT; segment++) {
      const segmentDir = join(routeDir, String(segment))
      const files = await readdir(segmentDir)
      for (const filename of files) {
        if (!filename.endsWith('qlog.zst') && !filename.endsWith('qcamera.ts') && !filename.endsWith('.hevc')) continue
        const path = `${ROUTE_ID}--${segment}/${filename}`
        const uploadUrl = await getUploadInfo(path, dongleId, deviceToken)
        const fileContent = await readFile(join(segmentDir, filename))
        await upload(uploadUrl, fileContent.buffer.slice(fileContent.byteOffset, fileContent.byteOffset + fileContent.byteLength) as ArrayBuffer)
      }
    }

    // Upload bootlog and crashlog (local/asius only - konik has different format)
    if (!isKonik) {
      const bootUpload = await getUploadInfo('boot/2024-01-01--12-00-00--bootlog.txt', dongleId, deviceToken)
      await upload(bootUpload, `boot log content ${Date.now()}`)
      const crashUpload = await getUploadInfo('crash/2024-01-01--12-00-00--crashlog.txt', dongleId, deviceToken)
      await upload(crashUpload, `crash log content ${Date.now()}`)
    }

    // Wait for processing
    console.log('Waiting for processing...')
    await new Promise((r) => setTimeout(r, 10000))
  }, 60000)

  describe('device endpoints', () => {
    test('get device', async () => {
      const res = await apiGet(`/v1.1/devices/${dongleId}/`, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data?.dongle_id).toBe(dongleId)
    })

    test.skipIf(isKonik)('set device alias', async () => {
      const res = await apiPatch(`/v1/devices/${dongleId}/`, { alias: `Test ${dongleId}` }, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data?.alias).toBe(`Test ${dongleId}`)
    })

    test.skipIf(isKonik)('location', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/location`, deviceToken)
      expect(res.status).toBe(200)
      expect(typeof res.data?.lat).toBe('number')
    })

    test('stats', async () => {
      const res = await apiGet(`/v1.1/devices/${dongleId}/stats`, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data?.all).toBeDefined()
      expect(res.data?.week).toBeDefined()
    })

    test.skipIf(isKonik)('bootlogs', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/bootlogs`, deviceToken)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.data)).toBe(true)
      expect(res.data.length).toBeGreaterThan(0)

      const content = await fetchUrl(res.data[0])
      expect(content).not.toBeNull()
      expect(new TextDecoder().decode(content!)).toContain('boot log content')
    })

    test.skipIf(isKonik)('crashlogs', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/crashlogs`, deviceToken)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.data)).toBe(true)
      expect(res.data.length).toBeGreaterThan(0)
    })
  })

  describe.skipIf(isKonik)('routes listing', () => {
    test('allRoutes', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/routes`, deviceToken)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.data)).toBe(true)
      expect(res.data.length).toBeGreaterThan(0)
    })

    test('preserved (empty)', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/routes/preserved`, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data).toEqual([])
    })

    test('routesSegments', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/routes_segments`, deviceToken)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.data)).toBe(true)
      expect(res.data.length).toBeGreaterThan(0)
    })

    test('routesSegments (specific)', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/routes_segments?route_str=${routeNameEncoded}`, deviceToken)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.data)).toBe(true)
      expect(res.data.length).toBeGreaterThan(0)
    })
  })

  describe.skipIf(isKonik)('route metadata', () => {
    test('matches expected', async () => {
      const res = await apiGet(`/v1/route/${routeNameEncoded}/`, deviceToken)
      expect(res.status).toBe(200)

      const expected = JSON.parse(await readFile(join(EXAMPLE_DATA_DIR, ROUTE_ID, 'route.json'), 'utf-8'))

      // Local-only fields
      if (provider.id === 'asius') {
        expect(res.data.version).toBe(expected.version)
        expect(res.data.git_dirty).toBe(expected.git_dirty)
        expect(res.data.git_commit_date).toBe(expected.git_commit_date)
        expect(res.data.vin).toBe(expected.vin)
        expect(res.data.make).toBe(expected.platform?.split('_')[0]?.toLowerCase())
      }

      expect(res.data.git_branch).toBe(expected.git_branch)
      expect(res.data.git_commit).toBe(expected.git_commit)
      expect(res.data.git_remote?.replace('https://', '')).toBe(expected.git_remote)
      expect(res.data.platform).toBe(expected.platform)
      expect(res.data.start_lat).toBeCloseTo(expected.start_lat, 1)
      expect(res.data.start_lng).toBeCloseTo(expected.start_lng, 1)
      expect(res.data.end_lat).toBeCloseTo(expected.end_lat, 1)
      expect(res.data.end_lng).toBeCloseTo(expected.end_lng, 1)
      expect(res.data.maxqlog).toBe(expected.maxqlog)
      expect(res.data.distance / expected.distance).toBeGreaterThan(0.5)
      expect(res.data.distance / expected.distance).toBeLessThan(2)
    })
  })

  describe('derived files', () => {
    test('route.url exists', async () => {
      const res = await apiGet(`/v1/route/${routeNameEncoded}/`, deviceToken)
      expect(res.data?.url).toBeDefined()
    })

    for (let segment = 0; segment < SEGMENTS_COUNT; segment++) {
      describe(`segment ${segment}`, () => {
        test.skipIf(isKonik)('events', async () => {
          const routeRes = await apiGet(`/v1/route/${routeNameEncoded}/`, deviceToken)
          const baseUrl = routeRes.data.url.replace(/\/$/, '')
          const data = await fetchUrl(`${baseUrl}/${segment}/events.json`)
          expect(data).not.toBeNull()

          const actual = JSON.parse(new TextDecoder().decode(data!)) as { type: string; data: unknown }[]
          const expected = JSON.parse(await readFile(join(EXAMPLE_DATA_DIR, ROUTE_ID, segment.toString(), `events.json`), 'utf-8')) as typeof actual
          expect(actual.length).toBe(expected.length)
          for (let i = 0; i < expected.length; i++) {
            expect(actual[i].type).toBe(expected[i].type)
            expect(actual[i].data).toEqual(expected[i].data)
          }
        })

        test.skipIf(isKonik)('coords', async () => {
          const routeRes = await apiGet(`/v1/route/${routeNameEncoded}/`, deviceToken)
          const baseUrl = routeRes.data.url.replace(/\/$/, '')
          const data = await fetchUrl(`${baseUrl}/${segment}/coords.json`)
          expect(data).not.toBeNull()

          const actual = JSON.parse(new TextDecoder().decode(data!)) as { lat: number; lng: number }[]
          const expected = JSON.parse(await readFile(join(EXAMPLE_DATA_DIR, ROUTE_ID, segment.toString(), `coords.json`), 'utf-8')) as typeof actual
          expect(Math.abs(actual.length - expected.length)).toBeLessThanOrEqual(2)
          for (let i = 0; i < Math.min(actual.length, expected.length); i++) {
            expect(actual[i].lat).toBeCloseTo(expected[i].lat, 3)
            expect(actual[i].lng).toBeCloseTo(expected[i].lng, 3)
          }
        })

        test('sprite', async () => {
          const routeRes = await apiGet(`/v1/route/${routeNameEncoded}/`, deviceToken)
          const baseUrl = routeRes.data.url.replace(/\/$/, '')
          const data = await fetchUrl(`${baseUrl}/${segment}/sprite.jpg`)
          expect(data).not.toBeNull()

          const actual = new Uint8Array(data!)
          const expected = new Uint8Array(await readFile(join(EXAMPLE_DATA_DIR, ROUTE_ID, segment.toString(), `sprite.jpg`)))
          expect(actual[0]).toBe(0xff)
          expect(actual[1]).toBe(0xd8)
          expect(Math.abs(actual.length - expected.length) / expected.length).toBeLessThan(0.1)
        })
      })
    }
  })

  describe('route files', () => {
    test('files endpoint', async () => {
      const res = await apiGet(`/v1/route/${routeNameEncoded}/files`, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data?.qlogs?.length).toBeGreaterThan(0)
      expect(res.data?.qcameras?.length).toBeGreaterThan(0)
    })
  })

  describe.skipIf(isKonik)('preserve', () => {
    test('preserve route', async () => {
      const res = await fetch(`${provider.apiUrl}/v1/route/${routeNameEncoded}/preserve`, {
        method: 'POST',
        headers: { Authorization: `JWT ${deviceToken}` },
      })
      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(1)
    })

    test('shows in preserved list', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/routes/preserved`, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data.length).toBeGreaterThan(0)
    })

    test('unpreserve route', async () => {
      const res = await fetch(`${provider.apiUrl}/v1/route/${routeNameEncoded}/preserve`, {
        method: 'DELETE',
        headers: { Authorization: `JWT ${deviceToken}` },
      })
      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(1)
    })

    test('removed from preserved list', async () => {
      const res = await apiGet(`/v1/devices/${dongleId}/routes/preserved`, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data).toEqual([])
    })
  })

  describe.skipIf(isKonik)('public access', () => {
    test('route is private by default', async () => {
      const res = await apiGet(`/v1/route/${routeNameEncoded}/`)
      expect(res.status).toBe(401)
    })

    test('set public', async () => {
      const res = await apiPatch(`/v1/route/${routeNameEncoded}/`, { is_public: true }, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data?.is_public).toBe(true)
    })

    test('route accessible without auth', async () => {
      const res = await apiGet(`/v1/route/${routeNameEncoded}/`)
      expect(res.status).toBe(200)
      expect(res.data?.dongle_id).toBe(dongleId)
    })

    test('set private', async () => {
      const res = await apiPatch(`/v1/route/${routeNameEncoded}/`, { is_public: false }, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data?.is_public).toBe(false)
    })

    test('route requires auth again', async () => {
      const res = await apiGet(`/v1/route/${routeNameEncoded}/`)
      expect(res.status).toBe(401)
    })
  })

  describe.skipIf(isKonik)('share signature', () => {
    test('get signature', async () => {
      const res = await apiGet(`/v1/route/${routeNameEncoded}/share_signature`, deviceToken)
      expect(res.status).toBe(200)
      expect(res.data?.sig).toBeDefined()
      expect(res.data?.exp).toBeDefined()
    })

    test('access with signature', async () => {
      const sigRes = await apiGet(`/v1/route/${routeNameEncoded}/share_signature`, deviceToken)
      const res = await apiGet(`/v1/route/${routeNameEncoded}/?sig=${sigRes.data.sig}`)
      expect(res.status).toBe(200)
      expect(res.data?.dongle_id).toBe(dongleId)
    })
  })

  test('print pair token', () => {
    const pairToken = jwt.sign({ identity: dongleId, pair: true }, privateKey, { algorithm: jwtAlgorithm, expiresIn: '1h' })
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Pairing URL: ${provider.apiUrl}/pair?pair=${pairToken}`)
    console.log(`Device ID: ${dongleId}`)
    console.log(`${'='.repeat(60)}\n`)
  })
})
