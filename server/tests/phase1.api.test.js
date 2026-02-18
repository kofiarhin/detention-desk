const request = require("supertest");
const { buildApp } = require("../app");

const GENERATED_SCHOOL_CODE_REGEX = /^DK-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

describe("Phase 1 API", () => {
  const app = buildApp();

  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { ok: true } });
  });

  test("POST /signup/school creates school + admin + policy + categories and returns token", async () => {
    const res = await request(app).post("/signup/school").send({
      schoolName: "Test Academy",
      adminName: "Admin User",
      adminEmail: "admin@test.com",
      adminPassword: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe("schoolAdmin");
    expect(typeof res.body.data.school.schoolCode).toBe("string");
    expect(res.body.data.school.schoolCode.length).toBeGreaterThan(0);
    expect(res.body.data.school.schoolCode).toBe(
      res.body.data.school.schoolCode.toUpperCase(),
    );
    expect(res.body.data.school.schoolCode).toMatch(GENERATED_SCHOOL_CODE_REGEX);
    expect(res.body.data.policy.defaultDetentionMinutes).toBe(30);
  });

  test("POST /auth/login returns token for valid schoolCode+email+password", async () => {
    const signup = await request(app).post("/signup/school").send({
      schoolName: "Test Academy",
      adminName: "Admin User",
      adminEmail: "admin@test.com",
      adminPassword: "password123",
    });

    const generatedSchoolCode = signup.body.data.school.schoolCode;

    const res = await request(app).post("/auth/login").send({
      schoolCode: generatedSchoolCode.toLowerCase(), // case-insensitive input
      email: "ADMIN@TEST.COM",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe("schoolAdmin");
  });

  test("School signup generates unique school codes", async () => {
    const firstSignup = await request(app).post("/signup/school").send({
      schoolName: "First Academy",
      adminName: "First Admin",
      adminEmail: "first-admin@test.com",
      adminPassword: "password123",
    });

    const secondSignup = await request(app).post("/signup/school").send({
      schoolName: "Second Academy",
      adminName: "Second Admin",
      adminEmail: "second-admin@test.com",
      adminPassword: "password123",
    });

    expect(firstSignup.status).toBe(201);
    expect(secondSignup.status).toBe(201);
    expect(firstSignup.body.data.school.schoolCode).not.toBe(
      secondSignup.body.data.school.schoolCode,
    );
  });

  test("Tenant routes require tenant token; owner token is forbidden", async () => {
    // create tenant + get admin token
    const signup = await request(app).post("/signup/school").send({
      schoolName: "Test Academy",
      adminName: "Admin User",
      adminEmail: "admin@test.com",
      adminPassword: "password123",
    });

    const adminToken = signup.body.data.token;

    // bootstrap owner
    const boot = await request(app)
      .post("/auth/owner/bootstrap")
      .set("x-bootstrap-secret", process.env.OWNER_BOOTSTRAP_SECRET)
      .send({
        name: "Platform Owner",
        email: "owner@detentiondesk.com",
        password: "password123",
      });

    expect(boot.status).toBe(201);

    // owner login
    const ownerLogin = await request(app).post("/auth/owner/login").send({
      email: "owner@detentiondesk.com",
      password: "password123",
    });

    expect(ownerLogin.status).toBe(200);
    const ownerToken = ownerLogin.body.data.token;

    // admin can access tenant route
    const policyOk = await request(app)
      .get("/policy")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(policyOk.status).toBe(200);
    expect(policyOk.body.success).toBe(true);

    // owner cannot access tenant route
    const policyNo = await request(app)
      .get("/policy")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(policyNo.status).toBe(403);
    expect(policyNo.body.success).toBe(false);
    expect(policyNo.body.error.code).toBe("FORBIDDEN");
  });

  test("Owner route requires owner token", async () => {
    // create tenant + get admin token
    const signup = await request(app).post("/signup/school").send({
      schoolName: "Test Academy",
      adminName: "Admin User",
      adminEmail: "admin@test.com",
      adminPassword: "password123",
    });

    const adminToken = signup.body.data.token;

    // tenant cannot hit owner route
    const tenantHitOwner = await request(app)
      .get("/owner/schools")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(tenantHitOwner.status).toBe(403);
    expect(tenantHitOwner.body.success).toBe(false);

    // bootstrap + login owner
    await request(app)
      .post("/auth/owner/bootstrap")
      .set("x-bootstrap-secret", process.env.OWNER_BOOTSTRAP_SECRET)
      .send({
        name: "Platform Owner",
        email: "owner@detentiondesk.com",
        password: "password123",
      });

    const ownerLogin = await request(app).post("/auth/owner/login").send({
      email: "owner@detentiondesk.com",
      password: "password123",
    });

    const ownerToken = ownerLogin.body.data.token;

    const ownerSchools = await request(app)
      .get("/owner/schools")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(ownerSchools.status).toBe(200);
    expect(ownerSchools.body.success).toBe(true);
    expect(Array.isArray(ownerSchools.body.data)).toBe(true);
  });
});
