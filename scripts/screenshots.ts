import fs from 'node:fs'
import { chromium, devices, type BrowserContext, type BrowserContextOptions } from 'playwright'

const baseUrl = process.argv[2]
const outDir = process.argv[3] || 'screenshots'
const dongleId = '1d3dc3e03047b0c7'
const endpoints = {
  Login: 'login',
  Pair: 'pair',
  Home: dongleId,
  Routes: `${dongleId}/routes`,
  Route: `${dongleId}/routes/000000dd--455f14369d`,
  Settings: `${dongleId}/settings`,
  Sentry: `${dongleId}/sentry`,
}

const takeScreenshots = async (deviceType: string, context: BrowserContext) => {
  const page = await context.newPage()
  for (const [route, path] of Object.entries(endpoints)) {
    await page.goto(`${baseUrl}/${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${outDir}/${route}-${deviceType}.playwright.png` })
    console.log(`${route}-${deviceType}.playwright.png`)

    if (route === 'Login') {
      await page.click("button:has-text('Try the demo')")
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(375)
    }
  }
  await page.close()
}

const main = async () => {
  let executablePath: string | undefined = '/usr/bin/chromium'
  if (!fs.existsSync(executablePath)) executablePath = undefined

  const browser = await chromium.launch({ executablePath, headless: true })

  const contexts: [string, BrowserContextOptions][] = [
    ['mobile', devices['iPhone 13']],
    ['desktop', { viewport: { width: 1920, height: 1080 } }],
  ]
  await Promise.all(
    contexts.map(async ([deviceType, options]) => {
      const context = await browser.newContext(options)
      await takeScreenshots(deviceType, context)
      await context.close()
    }),
  )

  await browser.close()
}

main()
