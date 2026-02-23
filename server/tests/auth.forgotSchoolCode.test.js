const request = require("supertest");
const { buildApp } = require("../app");

describe("POST /api/auth/forgot-school-code", () => {
  const app = buildApp();

  test("returns 400 if fields are missing", async () => {
    const res = await request(app).post("/api/auth/forgot-school-code").send({
      email: "",
      password: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].field).toBe("email");
  });

  test("returns 401 for invalid credentials", async () => {
    await request(app).post("/signup/school").send({
      schoolName: "Credential Academy",
      adminName: "Credential Admin",
      adminEmail: "admin@credential.test",
      adminPassword: "password123",
    });

    const res = await request(app).post("/api/auth/forgot-school-code").send({
      email: "admin@credential.test",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid credentials" });
  });

  test("returns schoolCode for valid credentials", async () => {
    const signup = await request(app).post("/signup/school").send({
      schoolName: "Valid Academy",
      adminName: "Valid Admin",
      adminEmail: "admin@valid.test",
      adminPassword: "password123",
    });

    const expectedSchoolCode = signup.body.data.school.schoolCode;

    const res = await request(app).post("/api/auth/forgot-school-code").send({
      email: "ADMIN@VALID.TEST",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ schoolCode: expectedSchoolCode });
  });
});
