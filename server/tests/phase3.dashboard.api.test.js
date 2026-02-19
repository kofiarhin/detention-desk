const request = require("supertest");

const { buildApp } = require("../app");
const { signToken } = require("../services/tokenService");

const User = require("../models/User");
const Category = require("../models/Category");
const Student = require("../models/Student");
const Incident = require("../models/Incident");
const Detention = require("../models/Detention");
const Reward = require("../models/Reward");
const DetentionOffset = require("../models/DetentionOffset");

const app = buildApp();

function dateDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

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

  const adminToken = signupRes.body.data.token;
  const adminUser = await User.findOne({ email: `${prefix.toLowerCase()}-admin@test.com` });

  const teacherHash = await User.hashPassword("password123");
  const teacher = await User.create({
    schoolId: adminUser.schoolId,
    name: `${prefix} Teacher`,
    email: `${prefix.toLowerCase()}-teacher@test.com`,
    passwordHash: teacherHash,
    role: "teacher",
  });

  const behaviour = await Category.findOne({ schoolId: adminUser.schoolId, type: "behaviour" });
  const reward = await Category.findOne({ schoolId: adminUser.schoolId, type: "reward" });

  return {
    schoolId: adminUser.schoolId,
    adminUser,
    adminToken,
    teacher,
    teacherToken: signToken({ userId: teacher._id, schoolId: teacher.schoolId, role: teacher.role }),
    behaviourCategoryId: behaviour._id,
    rewardCategoryId: reward._id,
  };
}

async function seedStudent(school, suffix) {
  return Student.create({
    schoolId: school.schoolId,
    firstName: `Student${suffix}`,
    lastName: `Last${suffix}`,
    admissionNumber: `${suffix}-001`,
    yearGroup: "Year 8",
    form: "8A",
    createdBy: school.adminUser._id,
    assignedTeacherId: school.teacher._id,
  });
}

describe("Phase 3 Dashboard API", () => {
  test("returns aggregated metrics with correct date windows, top widgets, and pagination", async () => {
    const tenantA = await createSchoolFixture("DashA");
    const tenantB = await createSchoolFixture("DashB");

    const [aStudent1, aStudent2, bStudent] = await Promise.all([
      seedStudent(tenantA, "A1"),
      seedStudent(tenantA, "A2"),
      seedStudent(tenantB, "B1"),
    ]);

    const [aInc1, aInc2, aInc3] = await Promise.all([
      Incident.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent1._id,
        categoryId: tenantA.behaviourCategoryId,
        reportedBy: tenantA.adminUser._id,
        occurredAt: dateDaysAgo(2),
      }),
      Incident.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent2._id,
        categoryId: tenantA.behaviourCategoryId,
        reportedBy: tenantA.adminUser._id,
        occurredAt: dateDaysAgo(6),
      }),
      Incident.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent2._id,
        categoryId: tenantA.behaviourCategoryId,
        reportedBy: tenantA.adminUser._id,
        occurredAt: dateDaysAgo(15),
      }),
    ]);

    await Incident.create({
      schoolId: tenantA.schoolId,
      studentId: aStudent1._id,
      categoryId: tenantA.behaviourCategoryId,
      reportedBy: tenantA.adminUser._id,
      occurredAt: dateDaysAgo(40),
    });

    await Incident.create({
      schoolId: tenantB.schoolId,
      studentId: bStudent._id,
      categoryId: tenantB.behaviourCategoryId,
      reportedBy: tenantB.adminUser._id,
      occurredAt: dateDaysAgo(1),
    });

    const [aDet1, aDet2, aDet3] = await Promise.all([
      Detention.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent1._id,
        incidentId: aInc1._id,
        minutesAssigned: 30,
        minutesRemaining: 20,
        status: "pending",
        createdBy: tenantA.adminUser._id,
        createdAt: dateDaysAgo(1),
      }),
      Detention.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent2._id,
        incidentId: aInc2._id,
        minutesAssigned: 40,
        minutesRemaining: 15,
        status: "scheduled",
        createdBy: tenantA.adminUser._id,
        createdAt: dateDaysAgo(3),
      }),
      Detention.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent2._id,
        incidentId: aInc3._id,
        minutesAssigned: 25,
        minutesRemaining: 0,
        status: "served",
        createdBy: tenantA.adminUser._id,
        createdAt: dateDaysAgo(18),
      }),
    ]);

    await Detention.create({
      schoolId: tenantA.schoolId,
      studentId: aStudent1._id,
      minutesAssigned: 10,
      minutesRemaining: 10,
      status: "voided",
      createdBy: tenantA.adminUser._id,
      createdAt: dateDaysAgo(45),
    });

    await Detention.create({
      schoolId: tenantB.schoolId,
      studentId: bStudent._id,
      minutesAssigned: 500,
      minutesRemaining: 500,
      status: "pending",
      createdBy: tenantB.adminUser._id,
      createdAt: dateDaysAgo(1),
    });

    const [rewardA1, rewardA2] = await Promise.all([
      Reward.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent1._id,
        categoryId: tenantA.rewardCategoryId,
        minutesAwarded: 12,
        notes: "R1",
        awardedBy: tenantA.adminUser._id,
        awardedAt: dateDaysAgo(2),
      }),
      Reward.create({
        schoolId: tenantA.schoolId,
        studentId: aStudent2._id,
        categoryId: tenantA.rewardCategoryId,
        minutesAwarded: 10,
        notes: "R2",
        awardedBy: tenantA.adminUser._id,
        awardedAt: dateDaysAgo(15),
      }),
    ]);

    await Reward.create({
      schoolId: tenantA.schoolId,
      studentId: aStudent2._id,
      categoryId: tenantA.rewardCategoryId,
      minutesAwarded: 7,
      notes: "R3",
      awardedBy: tenantA.adminUser._id,
      awardedAt: dateDaysAgo(45),
    });

    await Reward.create({
      schoolId: tenantB.schoolId,
      studentId: bStudent._id,
      categoryId: tenantB.rewardCategoryId,
      minutesAwarded: 300,
      notes: "B",
      awardedBy: tenantB.adminUser._id,
      awardedAt: dateDaysAgo(1),
    });

    await Promise.all([
      DetentionOffset.create({
        schoolId: tenantA.schoolId,
        rewardId: rewardA1._id,
        detentionId: aDet1._id,
        studentId: aStudent1._id,
        minutesApplied: 5,
        appliedAt: dateDaysAgo(1),
        appliedBy: tenantA.adminUser._id,
      }),
      DetentionOffset.create({
        schoolId: tenantA.schoolId,
        rewardId: rewardA2._id,
        detentionId: aDet2._id,
        studentId: aStudent2._id,
        minutesApplied: 8,
        appliedAt: dateDaysAgo(20),
        appliedBy: tenantA.adminUser._id,
      }),
      DetentionOffset.create({
        schoolId: tenantA.schoolId,
        rewardId: rewardA2._id,
        detentionId: aDet3._id,
        studentId: aStudent2._id,
        minutesApplied: 6,
        appliedAt: dateDaysAgo(45),
        appliedBy: tenantA.adminUser._id,
      }),
    ]);

    await DetentionOffset.create({
      schoolId: tenantB.schoolId,
      rewardId: rewardA1._id,
      detentionId: aDet1._id,
      studentId: bStudent._id,
      minutesApplied: 999,
      appliedAt: dateDaysAgo(1),
      appliedBy: tenantB.adminUser._id,
    });

    const res = await request(app)
      .get("/api/dashboard/admin?topLimit=2&recentPage=1&recentLimit=2")
      .set("Authorization", `Bearer ${tenantA.adminToken}`);

    expect(res.status).toBe(200);

    const { metrics, widgets } = res.body.data;

    expect(metrics.totalIncidents7d).toBe(2);
    expect(metrics.totalIncidents30d).toBe(3);

    expect(metrics.totalDetentions7d).toBe(2);
    expect(metrics.totalDetentions30d).toBe(3);
    expect(metrics.detentionsByStatus).toEqual({
      pending: 1,
      scheduled: 1,
      served: 1,
      voided: 1,
    });

    expect(metrics.minutesAssignedTotal).toBe(105);
    expect(metrics.minutesRemainingTotal).toBe(45);

    expect(metrics.rewardMinutesAwarded7d).toBe(12);
    expect(metrics.rewardMinutesAwarded30d).toBe(22);

    expect(metrics.offsetMinutesApplied7d).toBe(5);
    expect(metrics.offsetMinutesApplied30d).toBe(13);

    expect(widgets.studentsWithHighestPendingMinutes).toHaveLength(2);
    expect(widgets.studentsWithHighestPendingMinutes[0].pendingMinutes).toBe(20);
    expect(widgets.studentsWithHighestPendingMinutes[1].pendingMinutes).toBe(15);

    expect(widgets.mostFrequentBehaviourCategories).toHaveLength(1);
    expect(widgets.mostFrequentBehaviourCategories[0].count).toBe(4);

    expect(widgets.recentIncidents.items).toHaveLength(2);
    expect(widgets.recentIncidents.meta.total).toBe(4);
    expect(widgets.recentIncidents.meta.pages).toBe(2);

    expect(widgets.recentDetentions.items).toHaveLength(2);
    expect(widgets.recentDetentions.meta.total).toBe(4);
    expect(widgets.recentDetentions.meta.pages).toBe(2);

    expect(widgets.recentRewards.items).toHaveLength(2);
    expect(widgets.recentRewards.meta.total).toBe(3);
    expect(widgets.recentRewards.meta.pages).toBe(2);
  });

  test("enforces auth boundaries: rejects unauthenticated, owner, and non-admin tenant roles", async () => {
    const tenant = await createSchoolFixture("Sec");

    const unauth = await request(app).get("/api/dashboard/admin");
    expect(unauth.status).toBe(401);

    const ownerBoot = await request(app)
      .post("/auth/owner/bootstrap")
      .set("x-bootstrap-secret", process.env.OWNER_BOOTSTRAP_SECRET)
      .send({ name: "Owner", email: "phase3-owner@test.com", password: "password123" });
    expect(ownerBoot.status).toBe(201);

    const ownerLogin = await request(app)
      .post("/auth/owner/login")
      .send({ email: "phase3-owner@test.com", password: "password123" });
    expect(ownerLogin.status).toBe(200);

    const ownerForbidden = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${ownerLogin.body.data.token}`);
    expect(ownerForbidden.status).toBe(403);

    const teacherForbidden = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${tenant.teacherToken}`);
    expect(teacherForbidden.status).toBe(403);
  });

  test("returns zeroed metrics and empty widgets for tenant with no dashboard records", async () => {
    const tenant = await createSchoolFixture("Empty");

    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${tenant.adminToken}`);

    expect(res.status).toBe(200);

    expect(res.body.data.metrics).toEqual({
      totalIncidents7d: 0,
      totalIncidents30d: 0,
      totalDetentions7d: 0,
      totalDetentions30d: 0,
      detentionsByStatus: {
        pending: 0,
        scheduled: 0,
        served: 0,
        voided: 0,
      },
      minutesAssignedTotal: 0,
      minutesRemainingTotal: 0,
      rewardMinutesAwarded7d: 0,
      rewardMinutesAwarded30d: 0,
      offsetMinutesApplied7d: 0,
      offsetMinutesApplied30d: 0,
    });

    expect(res.body.data.widgets.studentsWithHighestPendingMinutes).toEqual([]);
    expect(res.body.data.widgets.mostFrequentBehaviourCategories).toEqual([]);

    expect(res.body.data.widgets.recentIncidents.items).toEqual([]);
    expect(res.body.data.widgets.recentIncidents.meta).toEqual({ page: 1, limit: 10, total: 0, pages: 0 });

    expect(res.body.data.widgets.recentDetentions.items).toEqual([]);
    expect(res.body.data.widgets.recentDetentions.meta).toEqual({ page: 1, limit: 10, total: 0, pages: 0 });

    expect(res.body.data.widgets.recentRewards.items).toEqual([]);
    expect(res.body.data.widgets.recentRewards.meta).toEqual({ page: 1, limit: 10, total: 0, pages: 0 });
  });

  test("recent widgets support page/limit pagination", async () => {
    const tenant = await createSchoolFixture("Page");
    const student = await seedStudent(tenant, "P1");

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Incident.create({
        schoolId: tenant.schoolId,
        studentId: student._id,
        categoryId: tenant.behaviourCategoryId,
        reportedBy: tenant.adminUser._id,
        occurredAt: dateDaysAgo(i),
      });
    }

    const page2 = await request(app)
      .get("/api/dashboard/admin?recentPage=2&recentLimit=2")
      .set("Authorization", `Bearer ${tenant.adminToken}`);

    expect(page2.status).toBe(200);
    expect(page2.body.data.widgets.recentIncidents.items).toHaveLength(2);
    expect(page2.body.data.widgets.recentIncidents.meta).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      pages: 3,
    });
  });
});
