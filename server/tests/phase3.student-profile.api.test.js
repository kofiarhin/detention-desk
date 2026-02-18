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

function dateMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
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

  const parent = await User.create({
    schoolId: adminUser.schoolId,
    name: `${prefix} Parent`,
    email: `${prefix.toLowerCase()}-parent@test.com`,
    passwordHash: teacherHash,
    role: "parent",
  });

  const behaviour = await Category.findOne({ schoolId: adminUser.schoolId, type: "behaviour" });
  const reward = await Category.findOne({ schoolId: adminUser.schoolId, type: "reward" });

  return {
    schoolId: adminUser.schoolId,
    adminUser,
    adminToken,
    teacherToken: signToken({ userId: teacher._id, schoolId: teacher.schoolId, role: teacher.role }),
    parentToken: signToken({ userId: parent._id, schoolId: parent.schoolId, role: parent.role }),
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
  });
}

describe("Phase 3 Student Profile Aggregation API", () => {
  test("returns student profile summary and attention flags with tenant isolation", async () => {
    const tenantA = await createSchoolFixture("ProfileA");
    const tenantB = await createSchoolFixture("ProfileB");

    const studentA = await seedStudent(tenantA, "A1");
    const studentB = await seedStudent(tenantB, "B1");

    const [incA1, incA2] = await Promise.all([
      Incident.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        categoryId: tenantA.behaviourCategoryId,
        reportedBy: tenantA.adminUser._id,
        occurredAt: dateMinutesAgo(20),
      }),
      Incident.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        categoryId: tenantA.behaviourCategoryId,
        reportedBy: tenantA.adminUser._id,
        occurredAt: dateMinutesAgo(10),
      }),
    ]);

    await Incident.create({
      schoolId: tenantB.schoolId,
      studentId: studentB._id,
      categoryId: tenantB.behaviourCategoryId,
      reportedBy: tenantB.adminUser._id,
      occurredAt: dateMinutesAgo(5),
    });

    const [detA1, detA2, detA3, detA4] = await Promise.all([
      Detention.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        incidentId: incA1._id,
        minutesAssigned: 30,
        minutesRemaining: 20,
        status: "pending",
        createdBy: tenantA.adminUser._id,
      }),
      Detention.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        incidentId: incA2._id,
        minutesAssigned: 40,
        minutesRemaining: 15,
        status: "scheduled",
        scheduledFor: dateMinutesAgo(120),
        createdBy: tenantA.adminUser._id,
      }),
      Detention.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        minutesAssigned: 25,
        minutesRemaining: 0,
        status: "served",
        createdBy: tenantA.adminUser._id,
      }),
      Detention.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        minutesAssigned: 10,
        minutesRemaining: 0,
        status: "voided",
        createdBy: tenantA.adminUser._id,
      }),
    ]);

    await Detention.create({
      schoolId: tenantB.schoolId,
      studentId: studentB._id,
      minutesAssigned: 999,
      minutesRemaining: 999,
      status: "pending",
      createdBy: tenantB.adminUser._id,
    });

    const [rewardA1, rewardA2] = await Promise.all([
      Reward.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        categoryId: tenantA.rewardCategoryId,
        minutesAwarded: 18,
        notes: "R1",
        awardedBy: tenantA.adminUser._id,
        awardedAt: dateMinutesAgo(6),
      }),
      Reward.create({
        schoolId: tenantA.schoolId,
        studentId: studentA._id,
        categoryId: tenantA.rewardCategoryId,
        minutesAwarded: 12,
        notes: "R2",
        awardedBy: tenantA.adminUser._id,
        awardedAt: dateMinutesAgo(3),
      }),
    ]);

    await Reward.create({
      schoolId: tenantB.schoolId,
      studentId: studentB._id,
      categoryId: tenantB.rewardCategoryId,
      minutesAwarded: 700,
      notes: "other",
      awardedBy: tenantB.adminUser._id,
      awardedAt: dateMinutesAgo(2),
    });

    await Promise.all([
      DetentionOffset.create({
        schoolId: tenantA.schoolId,
        rewardId: rewardA1._id,
        detentionId: detA1._id,
        studentId: studentA._id,
        minutesApplied: 8,
        appliedAt: dateMinutesAgo(2),
        appliedBy: tenantA.adminUser._id,
      }),
      DetentionOffset.create({
        schoolId: tenantA.schoolId,
        rewardId: rewardA2._id,
        detentionId: detA2._id,
        studentId: studentA._id,
        minutesApplied: 6,
        appliedAt: dateMinutesAgo(1),
        appliedBy: tenantA.adminUser._id,
      }),
      DetentionOffset.create({
        schoolId: tenantA.schoolId,
        rewardId: rewardA2._id,
        detentionId: detA3._id,
        studentId: studentA._id,
        minutesApplied: 4,
        appliedAt: dateMinutesAgo(4),
        appliedBy: tenantA.adminUser._id,
      }),
    ]);

    await DetentionOffset.create({
      schoolId: tenantB.schoolId,
      rewardId: rewardA1._id,
      detentionId: detA4._id,
      studentId: studentB._id,
      minutesApplied: 123,
      appliedAt: dateMinutesAgo(1),
      appliedBy: tenantB.adminUser._id,
    });

    const res = await request(app)
      .get(`/api/students/${studentA._id}/profile`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.student.firstName).toBe(studentA.firstName);
    expect(res.body.data.summary).toEqual({
      incidentsTotal: 2,
      detentionsTotal: 4,
      detentionsByStatus: {
        pending: 1,
        scheduled: 1,
        served: 1,
        voided: 1,
      },
      minutesAssignedTotal: 105,
      minutesRemainingTotal: 35,
      rewardsTotal: 2,
      rewardMinutesAwardedTotal: 30,
      offsetMinutesAppliedTotal: 18,
    });
    expect(res.body.data.flags).toEqual({
      hasPendingDetentions: true,
      hasOverdueScheduledDetentions: true,
    });

    const crossTenant = await request(app)
      .get(`/api/students/${studentB._id}/profile`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);

    expect(crossTenant.status).toBe(404);
  });

  test("returns zeroed student profile summary when student has no timeline records", async () => {
    const tenant = await createSchoolFixture("EmptyP");
    const student = await seedStudent(tenant, "EMPTY");

    const res = await request(app)
      .get(`/api/students/${student._id}/profile`)
      .set("Authorization", `Bearer ${tenant.teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({
      incidentsTotal: 0,
      detentionsTotal: 0,
      detentionsByStatus: {
        pending: 0,
        scheduled: 0,
        served: 0,
        voided: 0,
      },
      minutesAssignedTotal: 0,
      minutesRemainingTotal: 0,
      rewardsTotal: 0,
      rewardMinutesAwardedTotal: 0,
      offsetMinutesAppliedTotal: 0,
    });
    expect(res.body.data.flags).toEqual({
      hasPendingDetentions: false,
      hasOverdueScheduledDetentions: false,
    });
  });

  test("returns independently paginated timeline lists newest-first and tenant-safe", async () => {
    const tenantA = await createSchoolFixture("TimelineA");
    const tenantB = await createSchoolFixture("TimelineB");
    const studentA = await seedStudent(tenantA, "T1");
    const studentB = await seedStudent(tenantB, "TB");

    const incidents = [];
    for (let i = 0; i < 5; i += 1) {
      incidents.push(
        Incident.create({
          schoolId: tenantA.schoolId,
          studentId: studentA._id,
          categoryId: tenantA.behaviourCategoryId,
          reportedBy: tenantA.adminUser._id,
          occurredAt: new Date(Date.now() - i * 1000),
          notes: `inc-${i}`,
        }),
      );
    }

    const detentions = [];
    for (let i = 0; i < 4; i += 1) {
      detentions.push(
        Detention.create({
          schoolId: tenantA.schoolId,
          studentId: studentA._id,
          minutesAssigned: 10 + i,
          minutesRemaining: 10 + i,
          status: "pending",
          createdBy: tenantA.adminUser._id,
          createdAt: new Date(Date.now() - i * 1000),
        }),
      );
    }

    const rewards = [];
    for (let i = 0; i < 3; i += 1) {
      rewards.push(
        Reward.create({
          schoolId: tenantA.schoolId,
          studentId: studentA._id,
          categoryId: tenantA.rewardCategoryId,
          minutesAwarded: 5 + i,
          awardedBy: tenantA.adminUser._id,
          awardedAt: new Date(Date.now() - i * 1000),
          notes: `reward-${i}`,
        }),
      );
    }

    const [incidentDocs, detentionDocs, rewardDocs] = await Promise.all([
      Promise.all(incidents),
      Promise.all(detentions),
      Promise.all(rewards),
    ]);

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await DetentionOffset.create({
        schoolId: tenantA.schoolId,
        rewardId: rewardDocs[i]._id,
        detentionId: detentionDocs[i]._id,
        studentId: studentA._id,
        minutesApplied: 1 + i,
        appliedAt: new Date(Date.now() - i * 1000),
        appliedBy: tenantA.adminUser._id,
      });
    }

    await Incident.create({
      schoolId: tenantB.schoolId,
      studentId: studentB._id,
      categoryId: tenantB.behaviourCategoryId,
      reportedBy: tenantB.adminUser._id,
      occurredAt: new Date(),
      notes: "other-tenant",
    });

    const res = await request(app)
      .get(
        `/api/students/${studentA._id}/timeline?incidentsPage=2&incidentsLimit=2&detentionsPage=1&detentionsLimit=3&rewardsPage=1&rewardsLimit=2&offsetsPage=1&offsetsLimit=2`,
      )
      .set("Authorization", `Bearer ${tenantA.teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.incidents.total).toBe(5);
    expect(res.body.data.incidents.items).toHaveLength(2);
    expect(res.body.data.incidents.items[0].notes).toBe("inc-2");
    expect(res.body.data.incidents.items[1].notes).toBe("inc-3");

    expect(res.body.data.detentions.total).toBe(4);
    expect(res.body.data.detentions.items).toHaveLength(3);
    expect(Number(res.body.data.detentions.items[0].minutesAssigned)).toBe(10);

    expect(res.body.data.rewards.total).toBe(3);
    expect(res.body.data.rewards.items).toHaveLength(2);
    expect(res.body.data.rewards.items[0].notes).toBe("reward-0");

    expect(res.body.data.offsets.total).toBe(3);
    expect(res.body.data.offsets.items).toHaveLength(2);
    expect(Number(res.body.data.offsets.items[0].minutesApplied)).toBe(1);

    const crossTenantTimeline = await request(app)
      .get(`/api/students/${studentB._id}/timeline`)
      .set("Authorization", `Bearer ${tenantA.teacherToken}`);

    expect(crossTenantTimeline.status).toBe(404);

    const filterLeakCheck = await request(app)
      .get(`/api/students/${studentA._id}/timeline?incidentsLimit=10`)
      .set("Authorization", `Bearer ${tenantA.teacherToken}`);

    const incidentNotes = filterLeakCheck.body.data.incidents.items.map((item) => item.notes);
    expect(incidentNotes).not.toContain("other-tenant");
    expect(String(filterLeakCheck.body.data.incidents.items[0]._id)).toBe(String(incidentDocs[0]._id));
  });

  test("enforces security: unauthenticated, owner, and non-allowed role are rejected", async () => {
    const tenant = await createSchoolFixture("AuthP");
    const student = await seedStudent(tenant, "AUTH");

    const unauth = await request(app).get(`/api/students/${student._id}/profile`);
    expect(unauth.status).toBe(401);

    const ownerToken = signToken({ userId: "507f191e810c19729de860ea", role: "owner", schoolId: null });
    const ownerRes = await request(app)
      .get(`/api/students/${student._id}/profile`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerRes.status).toBe(403);

    const parentRes = await request(app)
      .get(`/api/students/${student._id}/timeline`)
      .set("Authorization", `Bearer ${tenant.parentToken}`);
    expect(parentRes.status).toBe(403);
  });
});
