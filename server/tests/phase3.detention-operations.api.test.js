const request = require("supertest");

const { buildApp } = require("../app");
const { signToken } = require("../services/tokenService");

const User = require("../models/User");
const Student = require("../models/Student");
const Detention = require("../models/Detention");

const app = buildApp();

async function createSchoolFixture(prefix) {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const schoolCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  const signupRes = await request(app).post("/signup/school").send({
    schoolName: `${prefix} School`,
    schoolCode,
    adminName: `${prefix} Admin`,
    adminEmail: `${prefix.toLowerCase()}-admin@test.com`,
    adminPassword: "password123",
  });

  expect(signupRes.status).toBe(201);

  const adminUser = await User.findOne({ email: `${prefix.toLowerCase()}-admin@test.com` });

  const teacherHash = await User.hashPassword("password123");
  const teacher = await User.create({
    schoolId: adminUser.schoolId,
    name: `${prefix} Teacher`,
    email: `${prefix.toLowerCase()}-teacher@test.com`,
    passwordHash: teacherHash,
    role: "teacher",
  });

  const student = await Student.create({
    schoolId: adminUser.schoolId,
    firstName: `${prefix} Student`,
    lastName: "One",
    admissionNumber: `${prefix}-001`,
    yearGroup: "Year 8",
    form: "8A",
    createdBy: adminUser._id,
  });

  return {
    schoolId: adminUser.schoolId,
    adminToken: signupRes.body.data.token,
    teacherToken: signToken({ userId: teacher._id, schoolId: teacher.schoolId, role: teacher.role }),
    adminUser,
    student,
  };
}

async function createDetention({ school, studentId, status, minutesRemaining = 30, createdAt = null }) {
  return Detention.create({
    schoolId: school.schoolId,
    studentId,
    minutesAssigned: 30,
    minutesRemaining,
    status,
    createdBy: school.adminUser._id,
    createdAt: createdAt || undefined,
  });
}

describe("Phase 3 Slice 3: detention operations", () => {
  test("GET /api/detentions supports filter combinations, tenant isolation, pagination, and owner is blocked", async () => {
    const schoolA = await createSchoolFixture("OpsA");
    const schoolB = await createSchoolFixture("OpsB");

    const studentA2 = await Student.create({
      schoolId: schoolA.schoolId,
      firstName: "OpsA Student",
      lastName: "Two",
      admissionNumber: "OPSA-002",
      yearGroup: "Year 8",
      form: "8B",
      createdBy: schoolA.adminUser._id,
    });

    const now = Date.now();
    await createDetention({
      school: schoolA,
      studentId: schoolA.student._id,
      status: "pending",
      minutesRemaining: 25,
      createdAt: new Date(now - 60 * 60 * 1000),
    });

    await createDetention({
      school: schoolA,
      studentId: schoolA.student._id,
      status: "served",
      minutesRemaining: 0,
      createdAt: new Date(now - 24 * 60 * 60 * 1000),
    });

    await createDetention({
      school: schoolA,
      studentId: studentA2._id,
      status: "pending",
      minutesRemaining: 20,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    });

    await createDetention({
      school: schoolB,
      studentId: schoolB.student._id,
      status: "pending",
      minutesRemaining: 30,
      createdAt: new Date(now - 30 * 60 * 1000),
    });

    const fromDate = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    const toDate = new Date(now).toISOString();
    const filtered = await request(app)
      .get(
        `/api/detentions?status=pending&studentId=${schoolA.student._id}&hasRemainingMinutes=true&fromDate=${fromDate}&toDate=${toDate}&page=1&limit=1`,
      )
      .set("Authorization", `Bearer ${schoolA.adminToken}`);

    expect(filtered.status).toBe(200);
    expect(filtered.body.meta.page).toBe(1);
    expect(filtered.body.meta.limit).toBe(1);
    expect(filtered.body.meta.total).toBe(1);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].status).toBe("pending");
    expect(String(filtered.body.data[0].studentId)).toBe(String(schoolA.student._id));

    const paged = await request(app)
      .get("/api/detentions?page=1&limit=500")
      .set("Authorization", `Bearer ${schoolA.adminToken}`);

    expect(paged.status).toBe(200);
    expect(paged.body.meta.limit).toBe(100);
    expect(paged.body.data).toHaveLength(3);

    const ownerToken = signToken({ userId: schoolA.adminUser._id, schoolId: null, role: "owner" });
    const ownerRes = await request(app)
      .get("/api/detentions")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(ownerRes.status).toBe(403);
    expect(ownerRes.body.error.code).toBe("FORBIDDEN");

    const tenantBList = await request(app)
      .get("/api/detentions")
      .set("Authorization", `Bearer ${schoolB.adminToken}`);

    expect(tenantBList.status).toBe(200);
    expect(tenantBList.body.meta.total).toBe(1);
  });

  test("POST /api/detentions/bulk/serve updates only eligible tenant detentions and returns accurate summary", async () => {
    const schoolA = await createSchoolFixture("ServeA");
    const schoolB = await createSchoolFixture("ServeB");

    const pending = await createDetention({ school: schoolA, studentId: schoolA.student._id, status: "pending" });
    const scheduled = await createDetention({ school: schoolA, studentId: schoolA.student._id, status: "scheduled" });
    const served = await createDetention({ school: schoolA, studentId: schoolA.student._id, status: "served", minutesRemaining: 0 });
    const otherTenantPending = await createDetention({ school: schoolB, studentId: schoolB.student._id, status: "pending" });

    const res = await request(app)
      .post("/api/detentions/bulk/serve")
      .set("Authorization", `Bearer ${schoolA.adminToken}`)
      .send({ detentionIds: [pending._id, scheduled._id, served._id, otherTenantPending._id].map(String) });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ totalRequested: 4, updatedCount: 2, skippedCount: 2 });

    const refreshed = await Detention.find({ _id: { $in: [pending._id, scheduled._id, served._id, otherTenantPending._id] } })
      .sort({ createdAt: 1 })
      .lean();

    const byId = new Map(refreshed.map((item) => [String(item._id), item]));
    expect(byId.get(String(pending._id)).status).toBe("served");
    expect(byId.get(String(pending._id)).minutesRemaining).toBe(0);
    expect(byId.get(String(scheduled._id)).status).toBe("served");
    expect(byId.get(String(served._id)).status).toBe("served");
    expect(byId.get(String(otherTenantPending._id)).status).toBe("pending");
  });

  test("POST /api/detentions/bulk/void only allows valid transitions", async () => {
    const school = await createSchoolFixture("VoidA");

    const pending = await createDetention({ school, studentId: school.student._id, status: "pending" });
    const scheduled = await createDetention({ school, studentId: school.student._id, status: "scheduled" });
    const served = await createDetention({ school, studentId: school.student._id, status: "served", minutesRemaining: 0 });

    const res = await request(app)
      .post("/api/detentions/bulk/void")
      .set("Authorization", `Bearer ${school.adminToken}`)
      .send({ detentionIds: [pending._id, scheduled._id, served._id].map(String) });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ totalRequested: 3, updatedCount: 2, skippedCount: 1 });

    const [p, s, sv] = await Promise.all([
      Detention.findById(pending._id).lean(),
      Detention.findById(scheduled._id).lean(),
      Detention.findById(served._id).lean(),
    ]);

    expect(p.status).toBe("voided");
    expect(s.status).toBe("voided");
    expect(sv.status).toBe("served");
  });

  test("POST /api/detentions/bulk/schedule schedules only pending detentions and validates future date", async () => {
    const school = await createSchoolFixture("SchedA");

    const pending = await createDetention({ school, studentId: school.student._id, status: "pending" });
    const served = await createDetention({ school, studentId: school.student._id, status: "served", minutesRemaining: 0 });

    const pastDateRes = await request(app)
      .post("/api/detentions/bulk/schedule")
      .set("Authorization", `Bearer ${school.adminToken}`)
      .send({ detentionIds: [pending._id].map(String), scheduledFor: new Date(Date.now() - 1000).toISOString() });

    expect(pastDateRes.status).toBe(400);

    const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post("/api/detentions/bulk/schedule")
      .set("Authorization", `Bearer ${school.adminToken}`)
      .send({ detentionIds: [pending._id, served._id].map(String), scheduledFor });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ totalRequested: 2, updatedCount: 1, skippedCount: 1 });

    const refreshedPending = await Detention.findById(pending._id).lean();
    const refreshedServed = await Detention.findById(served._id).lean();

    expect(refreshedPending.status).toBe("scheduled");
    expect(new Date(refreshedPending.scheduledFor).toISOString()).toBe(scheduledFor);
    expect(refreshedServed.status).toBe("served");
  });

  test("bulk operation security: owner blocked, teacher blocked, unauthenticated blocked", async () => {
    const school = await createSchoolFixture("SecA");

    const detention = await createDetention({ school, studentId: school.student._id, status: "pending" });

    const ownerToken = signToken({ userId: school.adminUser._id, schoolId: null, role: "owner" });

    const ownerRes = await request(app)
      .post("/api/detentions/bulk/serve")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ detentionIds: [String(detention._id)] });

    expect(ownerRes.status).toBe(403);

    const teacherRes = await request(app)
      .post("/api/detentions/bulk/serve")
      .set("Authorization", `Bearer ${school.teacherToken}`)
      .send({ detentionIds: [String(detention._id)] });

    expect(teacherRes.status).toBe(403);

    const unauthRes = await request(app).post("/api/detentions/bulk/serve").send({ detentionIds: [String(detention._id)] });
    expect(unauthRes.status).toBe(401);
  });

  test("bulk edge cases: empty array, invalid objectId, and partial success", async () => {
    const school = await createSchoolFixture("EdgeA");

    const pending = await createDetention({ school, studentId: school.student._id, status: "pending" });
    const voided = await createDetention({ school, studentId: school.student._id, status: "voided", minutesRemaining: 0 });

    const emptyRes = await request(app)
      .post("/api/detentions/bulk/void")
      .set("Authorization", `Bearer ${school.adminToken}`)
      .send({ detentionIds: [] });

    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.data).toEqual({ totalRequested: 0, updatedCount: 0, skippedCount: 0 });

    const invalidRes = await request(app)
      .post("/api/detentions/bulk/void")
      .set("Authorization", `Bearer ${school.adminToken}`)
      .send({ detentionIds: ["not-an-object-id"] });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe("VALIDATION_ERROR");

    const partialRes = await request(app)
      .post("/api/detentions/bulk/void")
      .set("Authorization", `Bearer ${school.adminToken}`)
      .send({ detentionIds: [pending._id, voided._id].map(String) });

    expect(partialRes.status).toBe(200);
    expect(partialRes.body.data).toEqual({ totalRequested: 2, updatedCount: 1, skippedCount: 1 });
  });
});
