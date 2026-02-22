const loginViaUi = async (page, { schoolCode, email, password }) => {
  await page.goto('/login')
  await page.getByLabel('School Code').fill(schoolCode)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}

module.exports = {
  loginViaUi,
}
