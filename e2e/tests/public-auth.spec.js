const { test, expect } = require('@playwright/test')
const { seedData } = require('../helpers/testData')
const { loginViaUi } = require('../helpers/auth')

test.describe('Public shell and authentication flows', () => {
  test.beforeEach(async ({ request }) => {
    await seedData(request)
  })

  const publicRoutes = ['/', '/about', '/features', '/login', '/register']

  for (const route of publicRoutes) {
    test(`navbar and footer render on ${route}`, async ({ page }) => {
      await page.goto(route)
      await expect(page.getByRole('link', { name: 'DetentionDesk' }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'About' })).toBeVisible()
      await expect(page.locator('footer')).toContainText('DetentionDesk')
    })
  }

  test('register school admin and show generated school code', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('School Name').fill('Summit High')
    await page.getByLabel('Admin Full Name').fill('Summit Admin')
    await page.getByLabel('Admin Email').fill('summit-admin@detentiondesk.test')
    await page.getByLabel('Admin Password').fill('AdminPass123!')
    await page.getByRole('button', { name: 'Create School' }).click()

    await expect(page.getByRole('heading', { name: 'School created successfully' })).toBeVisible()
    await expect(page.getByText('Your School Code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go to Login' })).toBeVisible()
  })

  test('login with invalid credentials shows an error', async ({ page }) => {
    const seed = await seedData(page.request)
    await page.goto('/login')
    await page.getByLabel('School Code').fill(seed.schoolCode)
    await page.getByLabel('Email').fill(seed.admin.email)
    await page.getByLabel('Password').fill('WrongPassword!')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByText('Request failed')).toBeVisible()
  })

  test('auth guard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('register blocks submission when required fields are missing', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('button', { name: 'Create School' }).click()
    await expect(page.getByLabel('School Name')).toBeFocused()
  })

  test('login and logout works for school admin', async ({ page, request }) => {
    const seed = await seedData(request)
    await loginViaUi(page, { schoolCode: seed.schoolCode, email: seed.admin.email, password: seed.admin.password })
    await expect(page).toHaveURL(/\/admin\/dashboard$/)

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/admin/students')
    await expect(page).toHaveURL(/\/login$/)
  })
})
