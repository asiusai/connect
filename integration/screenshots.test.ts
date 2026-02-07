import fs from 'node:fs'
import { test } from 'bun:test'
import { chromium, devices as playDevices } from 'playwright'
import { keys } from '../shared/helpers'
import { DEFAULT_PROVIDERS } from '../shared/provider'
import { env } from '../shared/env'

const FOLDER = process.env.FOLDER || 'site/public/screenshots'
const DEVICE = process.env.DEVICE
const EXECUTABLE = '/usr/bin/chromium'

const DEVICES = {
  mobile: playDevices['iPhone 13'],
  desktop: playDevices['Desktop Chrome'],
}

const deviceList = keys(DEVICES).filter((x) => !DEVICE || DEVICE.split(',').includes(x))

for (const info of Object.values(DEFAULT_PROVIDERS)) {
  const BASE_URL = env.CONNECT_URL
  const DONGLE_ID = info.demoDongleId
  const ROUTE_ID = info.demoRouteId

  const PAGES = {
    login: 'login',

    home: DONGLE_ID,

    'first-pair': 'first-pair',
    pair: 'pair',
    settings: `${DONGLE_ID}/settings`,

    route: `${DONGLE_ID}/${ROUTE_ID}`,
    'route-clip': `${DONGLE_ID}/${ROUTE_ID}/10/100`,
    'route-qlogs': `${DONGLE_ID}/${ROUTE_ID}/qlogs`,
  }
  for (const device of deviceList) {
    test.concurrent(
      `${info.id} ${device} screenshots`,
      async () => {
        const browser = await chromium.launch({ executablePath: fs.existsSync(EXECUTABLE) ? EXECUTABLE : undefined, headless: true })

        const context = await browser.newContext(DEVICES[device])
        const page = await context.newPage()

        await page.goto(`${BASE_URL}/demo?provider=${info.id}`, { waitUntil: 'networkidle' })

        for (const [name, route] of Object.entries(PAGES)) {
          const path = `${FOLDER}/${info.id}/${device}/${name}.png`
          await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'networkidle', timeout: 120_000 })

          await page.screenshot({ path, fullPage: true })
        }

        await page.close()
        await context.close()

        await browser.close()
      },
      { timeout: 120_000 },
    )
  }
}
