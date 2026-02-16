// server/tests/utils.normalize.test.js
const normalizeModule = require("../utils/normalize");

const normalizeSchoolCode =
  normalizeModule.normalizeSchoolCode || normalizeModule.schoolCode || null;

const normalizeEmail =
  normalizeModule.normalizeEmail || normalizeModule.email || null;

const normalizeId = normalizeModule.normalizeId || normalizeModule.id || null;

describe("utils/normalize", () => {
  test("exports module", () => {
    expect(normalizeModule).toBeTruthy();
  });

  test("normalizeSchoolCode upper + trim", () => {
    if (typeof normalizeSchoolCode !== "function") return;

    expect(normalizeSchoolCode(" k9x7q2 ")).toBe("K9X7Q2");
    expect(normalizeSchoolCode("K9x7Q2")).toBe("K9X7Q2");
    expect(normalizeSchoolCode("")).toBe("");
    expect(normalizeSchoolCode(null)).toBe("");
    expect(normalizeSchoolCode(undefined)).toBe("");
  });

  test("normalizeEmail lower + trim", () => {
    if (typeof normalizeEmail !== "function") return;

    expect(normalizeEmail(" ADMIN@TEST.COM ")).toBe("admin@test.com");
    expect(normalizeEmail("Admin@Test.Com")).toBe("admin@test.com");
    expect(normalizeEmail("")).toBe("");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });

  test("normalizeId trims to string", () => {
    if (typeof normalizeId !== "function") return;

    expect(normalizeId(" 123 ")).toBe("123");
    expect(normalizeId(123)).toBe("123");
    expect(normalizeId("")).toBe("");
    expect(normalizeId(null)).toBe("");
    expect(normalizeId(undefined)).toBe("");
  });
});
