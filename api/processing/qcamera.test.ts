import { describe, expect, test } from 'bun:test'
import { extractSpriteFromFile } from './qcamera'

const TEST_DATA_DIR = import.meta.dir + '/../../example-data'
const ROUTES = [{ name: '0000002c--d68dde99ca', segmentCount: 3 }]

describe('qcamera', () => {
  for (const route of ROUTES) {
    for (let segment = 0; segment < route.segmentCount; segment++) {
      test(`${route.name}--${segment} sprite matches comma API`, async () => {
        const qcameraPath = `${TEST_DATA_DIR}/${route.name}/${segment}/qcamera.ts`
        const expectedPath = `${TEST_DATA_DIR}/${route.name}/${segment}/sprite.jpg`

        const sprite = await extractSpriteFromFile(qcameraPath)
        expect(sprite).not.toBeNull()

        // Valid JPEG (starts with FFD8)
        expect(sprite![0]).toBe(0xff)
        expect(sprite![1]).toBe(0xd8)

        // Size within 10% of expected (same frame, different encoder settings)
        const expectedData = await Bun.file(expectedPath).arrayBuffer()
        const expected = new Uint8Array(expectedData)
        const sizeDiff = Math.abs(sprite!.length - expected.length) / expected.length
        expect(sizeDiff).toBeLessThan(0.1)
      })
    }
  }

  test('sprite dimensions are 128x96', async () => {
    const qcameraPath = `${TEST_DATA_DIR}/${ROUTES[0].name}/0/qcamera.ts`

    const sprite = await extractSpriteFromFile(qcameraPath)
    expect(sprite).not.toBeNull()

    const tempPath = `/tmp/test-sprite-${Date.now()}.jpg`
    await Bun.write(tempPath, sprite!)

    const proc = Bun.spawn(['ffprobe', '-v', 'quiet', '-show_entries', 'stream=width,height', '-of', 'json', tempPath])
    const output = await new Response(proc.stdout).text()
    await proc.exited

    await Bun.spawn(['rm', '-f', tempPath]).exited

    const info = JSON.parse(output)
    expect(info.streams[0].width).toBe(128)
    expect(info.streams[0].height).toBe(96)
  })
})
