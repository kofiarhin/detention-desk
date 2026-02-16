// server/tests/utils.response.test.js
const { successResponse, errorResponse } = require("../utils/response");

describe("utils/response", () => {
  test("successResponse returns { success:true, data }", () => {
    const out = successResponse({ ok: true });
    expect(out).toBeTruthy();
    expect(out.success).toBe(true);
    expect(out.data).toEqual({ ok: true });
  });

  test("successResponse may include meta when provided", () => {
    const out = successResponse({ ok: true }, { page: 1 });
    expect(out.success).toBe(true);
    expect(out.data).toEqual({ ok: true });

    if (Object.prototype.hasOwnProperty.call(out, "meta")) {
      expect(out.meta).toEqual({ page: 1 });
    }
  });

  test("errorResponse returns { success:false, error:{code,message} }", () => {
    const out = errorResponse("NOT_FOUND", "Route not found");
    expect(out).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });
});
