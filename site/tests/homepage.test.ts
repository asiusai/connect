import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders hero section', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('The Better Way to Use Openpilot')
    await expect(page.getByText('Open source openpilot companion')).toBeVisible()
    await expect(page.getByText('Better file management, nicer UI, video streaming')).toBeVisible()
  })

  test('has Get Started Free button linking to comma.asius.ai', async ({ page }) => {
    const getStartedBtn = page.getByRole('link', { name: /Get Started Free/i })
    await expect(getStartedBtn).toBeVisible()
    await expect(getStartedBtn).toHaveAttribute('href', 'https://comma.asius.ai')
  })

  test('has Learn More button linking to features section', async ({ page }) => {
    const learnMoreBtn = page.getByRole('link', { name: /Learn More/i })
    await expect(learnMoreBtn).toBeVisible()
    await expect(learnMoreBtn).toHaveAttribute('href', '#features')
  })

  test('renders Frontend Only section', async ({ page }) => {
    const frontendSection = page.locator('section').filter({ hasText: 'Frontend Only' })
    await expect(frontendSection).toBeVisible()
    await expect(frontendSection.getByText('Free forever').first()).toBeVisible()
    await expect(frontendSection.getByText('Better file management')).toBeVisible()
    await expect(frontendSection.getByText('Modern, clean UI')).toBeVisible()
    await expect(frontendSection.getByText('Video playback')).toBeVisible()
    await expect(frontendSection.getByText('Web & Android apps')).toBeVisible()
  })

  test('has Open for Comma and Konik links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Open for Comma' })).toHaveAttribute('href', 'https://comma.asius.ai')
    await expect(page.getByRole('link', { name: 'Open for Konik' })).toHaveAttribute('href', 'https://konik.asius.ai')
  })

  test('renders Our Forks section', async ({ page }) => {
    // Use h2 to find the specific section since multiple sections contain similar words
    const forksSection = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Our Forks' }) })
    await expect(forksSection).toBeVisible()
    await expect(forksSection.getByText('Live video streaming')).toBeVisible()
    await expect(forksSection.getByText('Joystick control')).toBeVisible()
    await expect(forksSection.getByText('Edit device params')).toBeVisible()
    await expect(forksSection.getByText('Switch models remotely')).toBeVisible()
  })

  test('has fork installation guide links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Install Openpilot Fork' })).toHaveAttribute('href', '/guides/install-openpilot')
    await expect(page.getByRole('link', { name: 'Install Sunnypilot Fork' })).toHaveAttribute('href', '/guides/install-sunnypilot')
  })

  test('renders Our API section with pricing', async ({ page }) => {
    const apiSection = page.locator('section').filter({ hasText: 'Our API' })
    await expect(apiSection).toBeVisible()
    await expect(apiSection.getByText('2 week free trial')).toBeVisible()
    await expect(apiSection.getByText('then $10/mo')).toBeVisible()
    await expect(apiSection.getByText('HQ video streaming')).toBeVisible()
    await expect(apiSection.getByText('Video clip rendering')).toBeVisible()
    await expect(apiSection.getByText('1TB storage per device')).toBeVisible()
  })

  test('has Start Free Trial button linking to connect.asius.ai', async ({ page }) => {
    const trialBtn = page.getByRole('link', { name: /Start Free Trial/i })
    await expect(trialBtn).toBeVisible()
    await expect(trialBtn).toHaveAttribute('href', 'https://connect.asius.ai')
  })

  test('page has correct title and meta', async ({ page }) => {
    await expect(page).toHaveTitle(/Asius AI/)
  })
})
