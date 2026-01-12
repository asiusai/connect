import fs from 'node:fs'
import { test } from 'bun:test'
import { chromium, devices as playDevices } from 'playwright'
import { keys } from '../connect/src/utils/helpers'
import { env } from '../connect/src/utils/env'

const FOLDER = process.env.FOLDER || 'screenshots'
const PAGE = process.env.PAGE
const DEVICE = process.env.DEVICE
const EXECUTABLE = '/usr/bin/chromium'

const DEVICES = {
  mobile: playDevices['iPhone 13'],
  desktop: playDevices['Desktop Chrome'],
}

const BASE_URL = env.CONNECT_URL
const DONGLE_ID = env.DEMO_DONGLE_ID
const ROUTE_ID = env.DEMO_ROUTE_ID

const PAGES = {
  login: 'login',

  home: DONGLE_ID,

  'first-pair': 'first-pair',
  pair: 'pair',
  settings: `${DONGLE_ID}/settings`,
  // sentry: `${DONGLE_ID}/sentry`,
  // params: `${DONGLE_ID}/params`,
  // live: `${DONGLE_ID}/live`,
  // analyze: `${DONGLE_ID}/analyze`,

  route: `${DONGLE_ID}/${ROUTE_ID}`,
  'route-clip': `${DONGLE_ID}/${ROUTE_ID}/10/100`,
  // 'route-public-clip': `a2a0ccea32023010/2023-07-27--13-01-19/10/300`,
  'route-qlogs': `${DONGLE_ID}/${ROUTE_ID}/qlogs`,
  // 'route-logs': `${DONGLE_ID}/${ROUTE_ID}/logs`,
}

const pageList = [...keys(PAGES).entries()].filter(([_, x]) => !PAGE || PAGE.split(',').includes(x))
const deviceList = keys(DEVICES).filter((x) => !DEVICE || DEVICE.split(',').includes(x))

for (const device of deviceList) {
  test(
    `${device} screenshots`,
    async () => {
      const browser = await chromium.launch({ executablePath: fs.existsSync(EXECUTABLE) ? EXECUTABLE : undefined, headless: true })

      const context = await browser.newContext(DEVICES[device])
      const page = await context.newPage()

      await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' })

      for (const [i, route] of pageList) {
        const path = `${FOLDER}/${env.MODE}/${device}-${i + 1}-${route}.png`
        await page.goto(`${BASE_URL}/${PAGES[route]}`, { waitUntil: 'networkidle' })

        await page.screenshot({ path, fullPage: true })
        console.log(path)
      }

      await page.close()
      await context.close()

      await browser.close()
    },
    { timeout: 120_000 },
  )
}
