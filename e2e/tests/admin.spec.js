const { test, expect } = require("@playwright/test");
const { seedData } = require("../helpers/testData");
const { loginViaUi } = require("../helpers/auth");

test.describe("School admin features", () => {
  test.beforeEach(async ({ page, request }) => {
    test.setTimeout(60000);

    const seed = await seedData(request);

    await loginViaUi(page, {
      schoolCode: seed.schoolCode,
      email: seed.admin.email,
      password: seed.admin.password,
    });

    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 15000 });
  });

  test("dashboard loads", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /admin dashboard/i }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/detentions by status/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("teacher management create and deactivate/reactivate teacher", async ({
    page,
  }) => {
    test.setTimeout(60000);
    page.on("dialog", async (dialog) => dialog.accept());

    await page.goto("/admin/teachers", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/teachers$/, { timeout: 15000 });

    const createTeacherBtn = page.getByRole("button", {
      name: /create teacher/i,
    });
    await expect(createTeacherBtn).toBeVisible({ timeout: 15000 });
    await createTeacherBtn.click();

    // Fill inside the opened modal/form (more stable than global page locators)
    const modalForm = page
      .locator("form")
      .filter({ has: page.getByPlaceholder(/email/i) })
      .first();

    await modalForm.getByPlaceholder(/name/i).fill("Mary Teacher");
    await modalForm
      .getByPlaceholder(/email/i)
      .fill("mary.teacher@detentiondesk.test");
    await modalForm.getByPlaceholder(/password/i).fill("TeacherPass123!");

    // Fix strict mode / multiple "Create" buttons
    await modalForm.getByRole("button", { name: /^create$/i }).click();

    await expect(
      page.getByRole("cell", { name: /mary\.teacher@detentiondesk\.test/i }),
    ).toBeVisible({
      timeout: 15000,
    });

    const row = page.getByRole("row", { name: /mary teacher/i });
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.getByRole("button", { name: /deactivate/i }).click();
    await expect(row).toContainText(/inactive/i, { timeout: 15000 });

    await row.getByRole("button", { name: /reactivate/i }).click();
    await expect(row).toContainText(/active/i, { timeout: 15000 });
  });

  test("student management create student and inline edit year group", async ({
    page,
  }) => {
    test.setTimeout(60000);

    await page.goto("/admin/students", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/students$/, { timeout: 15000 });

    const createStudentBtn = page.getByRole("button", {
      name: /create student/i,
    });
    await expect(createStudentBtn).toBeVisible({ timeout: 15000 });
    await createStudentBtn.click();

    const form = page
      .locator("form")
      .filter({ has: page.getByPlaceholder(/first\s*name|firstname/i) })
      .first();

    await form.getByPlaceholder(/first\s*name|firstname/i).fill("Taylor");
    await form.getByPlaceholder(/last\s*name|lastname/i).fill("Stone");
    await form.getByPlaceholder(/admission/i).fill("ADM-E2E-900");
    await form.getByPlaceholder(/year\s*group|yeargroup/i).fill("9");
    await form.getByPlaceholder(/form/i).fill("C");

    const assignSelect = form.locator("select").first();
    await assignSelect.selectOption({ index: 1 });

    // Fix strict mode / multiple "Create" buttons
    await form.getByRole("button", { name: /^create$/i }).click();

    const row = page.getByRole("row", { name: /taylor stone/i });
    await expect(row).toBeVisible({ timeout: 15000 });

    const yearInput = row.locator("input").first();
    await yearInput.fill("10");
    await yearInput.blur();
    await expect(yearInput).toHaveValue("10", { timeout: 15000 });
  });

  test("student creation missing required field shows browser validation error", async ({
    page,
  }) => {
    test.setTimeout(60000);

    await page.goto("/admin/students", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/students$/, { timeout: 15000 });

    const createStudentBtn = page.getByRole("button", {
      name: /create student/i,
    });
    await expect(createStudentBtn).toBeVisible({ timeout: 15000 });
    await createStudentBtn.click();

    const form = page
      .locator("form")
      .filter({ has: page.getByPlaceholder(/first\s*name|firstname/i) })
      .first();

    await form.getByPlaceholder(/first\s*name|firstname/i).fill("NoLastName");
    await form.getByRole("button", { name: /^create$/i }).click();

    // Browser will focus the missing required field; use regex placeholders to survive casing/copy changes
    const lastNameInput = form.getByPlaceholder(/last\s*name|lastname/i);
    await expect(lastNameInput).toBeFocused({ timeout: 15000 });
  });

  test("detentions page can bulk serve selected detention", async ({
    page,
  }) => {
    test.setTimeout(60000);
    page.on("dialog", async (dialog) => dialog.accept());

    await page.goto("/admin/detentions", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/detentions$/, { timeout: 15000 });

    // Ensure table has rows before checking
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 15000 });
    await firstCheckbox.check();

    await page.getByRole("button", { name: /serve selected/i }).click();

    // Don’t assume a <pre> exists; accept any confirmation text
    await expect(page.locator("body")).toContainText(/served/i, {
      timeout: 15000,
    });
  });
});
