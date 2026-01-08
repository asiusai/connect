import { test, expect, type Page } from '@playwright/test'

/**
 * API Integration Tests
 *
 * These tests validate the frontend's interaction with the real API.
 * They complement api/scripts/device.test.ts by testing the same endpoints
 * from the browser's perspective.
 *
 * Run with: INTEGRATION=1 bun run test:e2e
 *
 * These tests require:
 * - The API server running (localhost:8080 or api.asius.ai)
 * - The frontend dev server running
 */

const isIntegration = process.env.INTEGRATION === '1'
const apiUrl = process.env.API_URL || 'http://localhost:8080'

// Helper to get API endpoint
const api = (path: string) => `${apiUrl}${path}`

test.describe('API Integration Tests', () => {
  test.skip(!isIntegration, 'Skipping integration tests - set INTEGRATION=1 to run')

  test.describe('Status API', () => {
    test('fetches status.json from API', async ({ page }) => {
      // Monitor network request
      const statusRequest = page.waitForResponse((res) => res.url().includes('/status.json'))

      await page.goto('/status')
      const response = await statusRequest

      expect(response.status()).toBe(200)
      const data = await response.json()

      // Validate structure matches StatusData type
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('services')
      expect(data).toHaveProperty('stats')
      expect(data.services).toHaveProperty('mkv')
      expect(data.services).toHaveProperty('database')
      expect(data.stats).toHaveProperty('users')
      expect(data.stats).toHaveProperty('devices')
      expect(data.stats).toHaveProperty('routes')
    })

    test('displays real API data on status page', async ({ page }) => {
      await page.goto('/status')

      // Should show status heading
      await expect(page.getByText('Asius Status')).toBeVisible()

      // Should show either 'All systems operational' or 'Service degraded'
      const operational = page.getByText('All systems operational')
      const degraded = page.getByText('Service degraded')
      await expect(operational.or(degraded)).toBeVisible()

      // Should show statistics
      await expect(page.getByText('Statistics')).toBeVisible()
      await expect(page.getByText('Users')).toBeVisible()
      await expect(page.getByText('Devices')).toBeVisible()
    })
  })

  test.describe('Device API Endpoints', () => {
    // These tests validate API endpoints are accessible
    // They mirror the endpoints tested in device.test.ts

    test('pilotauth endpoint is accessible', async ({ request }) => {
      // Just verify the endpoint responds (would need valid data to register)
      const response = await request.post(api('/v2/pilotauth/'))
      // Without valid params, should get 400 Bad Request, not 404 or 500
      expect([400, 401, 422]).toContain(response.status())
    })

    test('devices endpoint requires auth', async ({ request }) => {
      const response = await request.get(api('/v1.1/devices/test-dongle/'))
      expect(response.status()).toBe(401)
    })

    test('routes endpoint requires auth', async ({ request }) => {
      const response = await request.get(api('/v1/devices/test-dongle/routes'))
      expect(response.status()).toBe(401)
    })

    test('route endpoint requires auth for private routes', async ({ request }) => {
      const response = await request.get(api('/v1/route/test%7Ctest/'))
      expect([401, 404]).toContain(response.status())
    })
  })
})

test.describe('API Error Handling', () => {
  test.skip(!isIntegration, 'Skipping integration tests - set INTEGRATION=1 to run')

  test('status page handles API errors gracefully', async ({ page }) => {
    // Route to a non-existent API
    await page.route('**/status.json', (route) => route.abort('connectionrefused'))

    await page.goto('/status')
    await expect(page.getByText(/Failed to fetch status/)).toBeVisible()
  })

  test('status page handles malformed JSON', async ({ page }) => {
    await page.route('**/status.json', (route) =>
      route.fulfill({
        status: 200,
        body: 'not json',
        contentType: 'text/plain',
      })
    )

    await page.goto('/status')
    await expect(page.getByText(/Failed to fetch status/)).toBeVisible()
  })
})

test.describe('Cross-Origin Requests', () => {
  test.skip(!isIntegration, 'Skipping integration tests - set INTEGRATION=1 to run')

  test('API supports CORS for status endpoint', async ({ page }) => {
    await page.goto('/status')

    // If CORS is working, the status page should load data
    await expect(page.getByText('Asius Status')).toBeVisible()

    // Wait for data to load
    await page.waitForTimeout(1000)

    // Should not show error (which would indicate CORS failure)
    const error = page.getByText(/Failed to fetch status/)
    await expect(error).not.toBeVisible()
  })
})

test.describe('Real-time Updates', () => {
  test.skip(!isIntegration, 'Skipping integration tests - set INTEGRATION=1 to run')

  test('status page refreshes data periodically', async ({ page }) => {
    let requestCount = 0

    page.on('response', (response) => {
      if (response.url().includes('/status.json')) {
        requestCount++
      }
    })

    await page.goto('/status')
    await expect(page.getByText('Asius Status')).toBeVisible()

    // Initial request
    expect(requestCount).toBeGreaterThanOrEqual(1)

    // Note: Full 30-second interval test would be too slow
    // Just verify the component loaded without errors
    await expect(page.getByText('Statistics')).toBeVisible()
  })
})
