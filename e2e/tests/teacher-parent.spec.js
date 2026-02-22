const { test, expect } = require('@playwright/test')
const { seedData } = require('../helpers/testData')
const { loginViaUi } = require('../helpers/auth')

test.describe('Teacher and parent role based flows', () => {
  test('teacher can view assigned students and is blocked from admin routes', async ({ page, request }) => {
    const seed = await seedData(request)

    await loginViaUi(page, {
      schoolCode: seed.schoolCode,
      email: seed.teacher.email,
      password: seed.teacher.password,
    })

    await expect(page).toHaveURL(/\/teacher\/students$/)
    await expect(page.getByRole('heading', { name: 'Assigned Students' })).toBeVisible()

    await page.getByRole('link', { name: seed.student.name }).click()
    await expect(page).toHaveURL(new RegExp(`/teacher/students/${seed.student.id}$`))
    await expect(page.getByRole('heading', { name: 'Student Profile' })).toBeVisible()

    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/teacher\/students$/)
  })

  test('parent can view linked students and update password with validation', async ({ page, request }) => {
    const seed = await seedData(request)

    await loginViaUi(page, {
      schoolCode: seed.schoolCode,
      email: seed.parent.email,
      password: seed.parent.password,
    })

    await expect(page).toHaveURL(/\/parent\/students$/)
    await expect(page.getByRole('heading', { name: 'Linked Students' })).toBeVisible()

    await page.getByRole('link', { name: seed.student.name }).click()
    await expect(page).toHaveURL(new RegExp(`/parent/students/${seed.student.id}$`))
    await expect(page.getByRole('heading', { name: 'Student Timeline' })).toBeVisible()

    await page.goto('/parent/change-password')
    await page.getByPlaceholder('Current password').fill(seed.parent.password)
    await page.getByPlaceholder('New password').fill('ParentPass456!')
    await page.getByPlaceholder('Confirm password').fill('ParentPass000!')
    await page.getByRole('button', { name: 'Update password' }).click()
    await expect(page.getByText('Passwords do not match')).toBeVisible()

    await page.getByPlaceholder('Confirm password').fill('ParentPass456!')
    await page.getByRole('button', { name: 'Update password' }).click()
    await expect(page).toHaveURL(/\/parent\/students$/)

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await loginViaUi(page, {
      schoolCode: seed.schoolCode,
      email: seed.parent.email,
      password: 'ParentPass456!',
    })
    await expect(page).toHaveURL(/\/parent\/students$/)
  })
})
