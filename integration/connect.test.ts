import fs from 'node:fs'
import { test } from 'bun:test'
import { chromium, devices as playDevices } from 'playwright'
import { keys } from '../connect/src/utils/helpers'

const BASE_URL = process.env.BASE_URL || 'https://comma.asius.ai'
const FOLDER = process.env.FOLDER || 'screenshots'
const PAGE = process.env.PAGE
const DEVICE = process.env.DEVICE
const EXECUTABLE = '/usr/bin/chromium'

const DEVICES = {
  mobile: playDevices['iPhone 13'],
  desktop: playDevices['Desktop Chrome'],
}

const PAGES = {
  login: 'login',

  home: `1d3dc3e03047b0c7`,

  'first-pair': 'first-pair',
  pair: 'pair',
  settings: `1d3dc3e03047b0c7/settings`,
  sentry: `1d3dc3e03047b0c7/sentry`,
  params: `1d3dc3e03047b0c7/params`,
  live: `1d3dc3e03047b0c7/live`,
  analyze: `1d3dc3e03047b0c7/analyze`,

  route: `1d3dc3e03047b0c7/000000dd--455f14369d`,
  'route-clip': `1d3dc3e03047b0c7/000000dd--455f14369d/10/300`,
  'route-public-clip': `a2a0ccea32023010/2023-07-27--13-01-19/10/300`,
  'route-qlogs': `1d3dc3e03047b0c7/000000dd--455f14369d/qlogs`,
  'route-logs': `1d3dc3e03047b0c7/000000dd--455f14369d/logs`,
}

const pageList = [...keys(PAGES).entries()].filter(([_, x]) => !PAGE || PAGE.split(',').includes(x))
const deviceList = keys(DEVICES).filter((x) => !DEVICE || DEVICE.split(',').includes(x))

for (const device of deviceList) {
  test(`${device} screenshots`, async () => {
    const browser = await chromium.launch({ executablePath: fs.existsSync(EXECUTABLE) ? EXECUTABLE : undefined, headless: true })

    const context = await browser.newContext(DEVICES[device])
    const page = await context.newPage()

    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' })

    for (const [i, route] of pageList) {
      const path = `${FOLDER}/${device}-${i + 1}-${route}.png`
      await page.goto(`${BASE_URL}/${PAGES[route]}`, { waitUntil: 'networkidle' })

      await page.screenshot({ path, fullPage: true })
      console.log(path)
    }

    await page.close()
    await context.close()

    await browser.close()
  })
}
