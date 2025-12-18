import fs from 'node:fs'
import { chromium, devices as playDevices } from 'playwright'
import { keys } from '../src/utils/helpers'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
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
  'login-google': 'login?provider=google',
  'login-apple': 'login?provider=apple',
  'login-github': 'login?provider=github',

  home: `1d3dc3e03047b0c7`,

  'first-pair': 'first-pair',
  pair: 'pair',
  settings: `1d3dc3e03047b0c7/settings`,
  sentry: `1d3dc3e03047b0c7/sentry`,

  route: `1d3dc3e03047b0c7/000000dd--455f14369d`,
  'route-public': `a2a0ccea32023010/2023-07-27--13-01-19`,
  'route-qlogs': `1d3dc3e03047b0c7/000000dd--455f14369d/qlogs`,
  'route-logs': `1d3dc3e03047b0c7/000000dd--455f14369d/logs`,
}

const pages = [...keys(PAGES).entries()].filter(([_, x]) => !PAGE || PAGE.split(',').includes(x))
const devices = keys(DEVICES).filter((x) => !DEVICE || DEVICE.split(',').includes(x))

const browser = await chromium.launch({ executablePath: fs.existsSync(EXECUTABLE) ? EXECUTABLE : undefined, headless: true })

await Promise.all(
  devices.map(async (device) => {
    const context = await browser.newContext(DEVICES[device])
    const page = await context.newPage()

    await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' })

    for (const [i, route] of pages) {
      await page.goto(`${BASE_URL}/${PAGES[route]}`, { waitUntil: 'networkidle' })

      const path = `${FOLDER}/${device}-${i + 1}-${route}.png`
      await page.screenshot({ path, fullPage: true })
      console.log(path)
    }
    await page.close()
    await context.close()
  }),
)

await browser.close()
