const { test, expect } = require('@playwright/test')
const { seedData } = require('../helpers/testData')
const { loginViaUi } = require('../helpers/auth')

test.describe('School admin features', () => {
  test.beforeEach(async ({ page, request }) => {
    const seed = await seedData(request)
    await loginViaUi(page, {
      schoolCode: seed.schoolCode,
      email: seed.admin.email,
      password: seed.admin.password,
    })
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
  })

  test('dashboard loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
    await expect(page.getByText('Detentions by Status')).toBeVisible()
  })

  test('teacher management create and deactivate/reactivate teacher', async ({ page }) => {
    page.on('dialog', async (dialog) => dialog.accept())

    await page.goto('/admin/teachers')
    await page.getByRole('button', { name: 'Create Teacher' }).click()
    await page.getByPlaceholder('Name').fill('Mary Teacher')
    await page.getByPlaceholder('Email').fill('mary.teacher@detentiondesk.test')
    await page.getByPlaceholder('Password').fill('TeacherPass123!')
    await page.getByRole('button', { name: 'Create' }).click()

    await expect(page.getByRole('cell', { name: 'mary.teacher@detentiondesk.test' })).toBeVisible()
    await page.getByRole('row', { name: /Mary Teacher/ }).getByRole('button', { name: 'Deactivate' }).click()
    await expect(page.getByRole('row', { name: /Mary Teacher/ })).toContainText('inactive')

    await page.getByRole('row', { name: /Mary Teacher/ }).getByRole('button', { name: 'Reactivate' }).click()
    await expect(page.getByRole('row', { name: /Mary Teacher/ })).toContainText('active')
  })

  test('student management create student and inline edit year group', async ({ page }) => {
    await page.goto('/admin/students')
    await page.getByRole('button', { name: 'Create Student' }).click()

    await page.getByPlaceholder('firstName').fill('Taylor')
    await page.getByPlaceholder('lastName').fill('Stone')
    await page.getByPlaceholder('admissionNumber').fill('ADM-E2E-900')
    await page.getByPlaceholder('yearGroup').fill('9')
    await page.getByPlaceholder('form').fill('C')

    const assignSelect = page.locator('form.admin-form select').first()
    await assignSelect.selectOption({ index: 1 })

    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByRole('row', { name: /Taylor Stone/ })).toBeVisible()

    const yearInput = page.getByRole('row', { name: /Taylor Stone/ }).locator('input').first()
    await yearInput.fill('10')
    await yearInput.blur()
    await expect(yearInput).toHaveValue('10')
  })

  test('student creation missing required field shows browser validation error', async ({ page }) => {
    await page.goto('/admin/students')
    await page.getByRole('button', { name: 'Create Student' }).click()
    await page.getByPlaceholder('firstName').fill('NoLastName')
    await page.getByRole('button', { name: 'Create' }).click()

    const lastNameInput = page.getByPlaceholder('lastName')
    await expect(lastNameInput).toBeFocused()
  })

  test('detentions page can bulk serve selected detention', async ({ page }) => {
    page.on('dialog', async (dialog) => dialog.accept())

    await page.goto('/admin/detentions')
    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first()
    await firstCheckbox.check()
    await page.getByRole('button', { name: 'Serve Selected' }).click()
    await expect(page.locator('pre')).toContainText('served')
  })
})
