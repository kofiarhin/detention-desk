const request = require("supertest");
const { buildApp } = require("../app");
const User = require("../models/User");
const Category = require("../models/Category");
const SchoolPolicy = require("../models/SchoolPolicy");
const Detention = require("../models/Detention");
const DetentionOffset = require("../models/DetentionOffset");
const { signToken } = require("../services/tokenService");

const app = buildApp();

async function createSchoolFixture(prefix = "A") {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const schoolCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const signup = await request(app).post("/signup/school").send({
    schoolName: `${prefix} School`,
    schoolCode,
    adminName: `${prefix} Admin`,
    adminEmail: `${prefix.toLowerCase()}admin@test.com`,
    adminPassword: "password123",
  });

  expect(signup.status).toBe(201);
  const adminToken = signup.body.data.token;
  const adminUser = await User.findOne({ email: `${prefix.toLowerCase()}admin@test.com` });
  const teacherHash = await User.hashPassword("password123");
  const teacher = await User.create({
    schoolId: adminUser.schoolId,
    name: `${prefix} Teacher`,
    email: `${prefix.toLowerCase()}teacher@test.com`,
    passwordHash: teacherHash,
    role: "teacher",
  });
  const teacherToken = signToken({
    userId: teacher._id,
    schoolId: teacher.schoolId,
    role: teacher.role,
  });

  const behaviour = await Category.findOne({ schoolId: adminUser.schoolId, type: "behaviour" });
  const reward = await Category.findOne({ schoolId: adminUser.schoolId, type: "reward" });

  return {
    schoolId: adminUser.schoolId,
    adminToken,
    adminUser,
    teacher,
    teacherToken,
    behaviour,
    reward,
  };
}

describe("Phase 2 API", () => {
  test("students CRUD + search/pagination + uniqueness + tenant isolation + owner blocked", async () => {
    const tenantA = await createSchoolFixture("A");
    const tenantB = await createSchoolFixture("B");

    await Category.findByIdAndUpdate(tenantA.behaviour._id, { detentionMinutes: 25 });

    const s1 = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({
        firstName: "Jane",
        lastName: "Doe",
        admissionNumber: "A-001",
        yearGroup: "Year 7",
        form: "7A",
      });

    expect(s1.status).toBe(201);

    const dupSameTenant = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({
        firstName: "Jake",
        lastName: "Doe",
        admissionNumber: "A-001",
        yearGroup: "Year 7",
        form: "7B",
      });
    expect(dupSameTenant.status).toBe(409);

    const sameAdmOtherTenant = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantB.adminToken}`)
      .send({
        firstName: "Other",
        lastName: "School",
        admissionNumber: "A-001",
        yearGroup: "Year 7",
        form: "7A",
      });
    expect(sameAdmOtherTenant.status).toBe(201);

    const list = await request(app)
      .get("/api/students?q=Jane&page=1&limit=1")
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.total).toBe(1);

    const getStudent = await request(app)
      .get(`/api/students/${s1.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(getStudent.status).toBe(200);

    const update = await request(app)
      .put(`/api/students/${s1.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ form: "7Z" });
    expect(update.status).toBe(200);
    expect(update.body.data.form).toBe("7Z");

    const crossTenantGet = await request(app)
      .get(`/api/students/${s1.body.data._id}`)
      .set("Authorization", `Bearer ${tenantB.adminToken}`);
    expect(crossTenantGet.status).toBe(404);

    const ownerBoot = await request(app)
      .post("/auth/owner/bootstrap")
      .set("x-bootstrap-secret", process.env.OWNER_BOOTSTRAP_SECRET)
      .send({ name: "Owner", email: "owner@test.com", password: "password123" });
    expect(ownerBoot.status).toBe(201);
    const ownerLogin = await request(app).post("/auth/owner/login").send({
      email: "owner@test.com",
      password: "password123",
    });
    const ownerBlocked = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${ownerLogin.body.data.token}`);
    expect(ownerBlocked.status).toBe(403);

    const del = await request(app)
      .delete(`/api/students/${s1.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(del.status).toBe(200);
    expect(del.body.data.status).toBe("inactive");
  });

  test("incidents create/list/update/delete with rules + detention engine", async () => {
    const tenantA = await createSchoolFixture("C");
    const tenantB = await createSchoolFixture("D");

    await Category.findByIdAndUpdate(tenantA.behaviour._id, { detentionMinutes: 40 });

    const student = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({
        firstName: "Sam",
        lastName: "Stone",
        admissionNumber: "S-001",
        yearGroup: "Year 8",
        form: "8A",
      });

    const badRef = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({
        studentId: student.body.data._id,
        categoryId: tenantA.reward._id,
        occurredAt: new Date().toISOString(),
      });
    expect(badRef.status).toBe(400);

    const incident = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send({
        studentId: student.body.data._id,
        categoryId: tenantA.behaviour._id,
        notes: "Late to class",
        occurredAt: new Date().toISOString(),
      });
    expect(incident.status).toBe(201);
    expect(incident.body.data.reportedBy).toBe(String(tenantA.teacher._id));

    const detention = await Detention.findOne({ incidentId: incident.body.data._id }).lean();
    expect(detention).toBeTruthy();
    expect(detention.minutesAssigned).toBe(40);
    expect(detention.minutesRemaining).toBe(40);

    const list = await request(app)
      .get(`/api/incidents?studentId=${student.body.data._id}&status=open`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);

    const updateByAdmin = await request(app)
      .put(`/api/incidents/${incident.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ notes: "Updated by admin" });
    expect(updateByAdmin.status).toBe(200);

    const otherTeacherHash = await User.hashPassword("password123");
    const otherTeacher = await User.create({
      schoolId: tenantA.schoolId,
      name: "Other Teacher",
      email: "otherteacher@test.com",
      passwordHash: otherTeacherHash,
      role: "teacher",
    });
    const otherTeacherToken = signToken({
      userId: otherTeacher._id,
      schoolId: tenantA.schoolId,
      role: "teacher",
    });
    const teacherForbidden = await request(app)
      .put(`/api/incidents/${incident.body.data._id}`)
      .set("Authorization", `Bearer ${otherTeacherToken}`)
      .send({ notes: "Nope" });
    expect(teacherForbidden.status).toBe(403);

    const crossTenant = await request(app)
      .get(`/api/incidents/${incident.body.data._id}`)
      .set("Authorization", `Bearer ${tenantB.adminToken}`);
    expect(crossTenant.status).toBe(404);

    const voidRes = await request(app)
      .delete(`/api/incidents/${incident.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.teacherToken}`);
    expect(voidRes.status).toBe(200);
    expect(voidRes.body.data.status).toBe("voided");
  });

  test("detention transitions + tenant isolation", async () => {
    const tenantA = await createSchoolFixture("E");
    const tenantB = await createSchoolFixture("F");

    await Category.findByIdAndUpdate(tenantA.behaviour._id, { detentionMinutes: 30 });

    const student = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ firstName: "Tim", lastName: "Town", admissionNumber: "T-001", yearGroup: "Year 9", form: "9A" });

    const incident = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ studentId: student.body.data._id, categoryId: tenantA.behaviour._id, occurredAt: new Date().toISOString() });

    const detention = await Detention.findOne({ incidentId: incident.body.data._id }).lean();

    const invalidTransition = await request(app)
      .put(`/api/detentions/${detention._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ status: "pending" });
    expect(invalidTransition.status).toBe(400);

    const schedule = await request(app)
      .put(`/api/detentions/${detention._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ status: "scheduled", scheduledFor: new Date().toISOString() });
    expect(schedule.status).toBe(200);

    await SchoolPolicy.findOneAndUpdate(
      { schoolId: tenantA.schoolId },
      { $set: { "teacherPermissions.canCompleteDetentions": true } },
    );

    const serve = await request(app)
      .post(`/api/detentions/${detention._id}/serve`)
      .set("Authorization", `Bearer ${tenantA.teacherToken}`);
    expect(serve.status).toBe(200);
    expect(serve.body.data.status).toBe("served");

    const crossTenant = await request(app)
      .get(`/api/detentions/${detention._id}`)
      .set("Authorization", `Bearer ${tenantB.adminToken}`);
    expect(crossTenant.status).toBe(404);
  });

  test("teacher permissions are enforced on create/serve endpoints with admin bypass", async () => {
    const tenantA = await createSchoolFixture("P");

    await SchoolPolicy.findOneAndUpdate(
      { schoolId: tenantA.schoolId },
      {
        $set: {
          "teacherPermissions.canCreateIncidents": false,
          "teacherPermissions.canCreateRewards": false,
          "teacherPermissions.canAddNotes": false,
          "teacherPermissions.canCompleteDetentions": false,
        },
      },
    );

    await Category.findByIdAndUpdate(tenantA.behaviour._id, { detentionMinutes: 20 });
    await Category.findByIdAndUpdate(tenantA.reward._id, { rewardMinutes: 20 });

    const student = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ firstName: "Perm", lastName: "Student", admissionNumber: "P-001", yearGroup: "Year 8", form: "8P" });

    const incidentBody = {
      studentId: student.body.data._id,
      categoryId: tenantA.behaviour._id,
      occurredAt: new Date().toISOString(),
    };

    const teacherIncidentForbidden = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send(incidentBody);
    expect(teacherIncidentForbidden.status).toBe(403);

    const adminIncidentAllowed = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send(incidentBody);
    expect(adminIncidentAllowed.status).toBe(201);

    await SchoolPolicy.findOneAndUpdate(
      { schoolId: tenantA.schoolId },
      { $set: { "teacherPermissions.canCreateIncidents": true } },
    );

    const teacherIncidentAllowed = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send({ ...incidentBody, occurredAt: new Date(Date.now() + 1000).toISOString() });
    expect(teacherIncidentAllowed.status).toBe(201);

    const rewardBody = { studentId: student.body.data._id, categoryId: tenantA.reward._id, notes: "Reward" };

    const teacherRewardForbidden = await request(app)
      .post("/api/rewards")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send(rewardBody);
    expect(teacherRewardForbidden.status).toBe(403);

    const adminRewardAllowed = await request(app)
      .post("/api/rewards")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send(rewardBody);
    expect(adminRewardAllowed.status).toBe(201);

    await SchoolPolicy.findOneAndUpdate(
      { schoolId: tenantA.schoolId },
      { $set: { "teacherPermissions.canCreateRewards": true } },
    );

    const teacherRewardAllowed = await request(app)
      .post("/api/rewards")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send(rewardBody);
    expect(teacherRewardAllowed.status).toBe(201);

    const noteBody = { entityType: "student", entityId: student.body.data._id, text: "Permission note" };

    const teacherNoteForbidden = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send(noteBody);
    expect(teacherNoteForbidden.status).toBe(403);

    const adminNoteAllowed = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send(noteBody);
    expect(adminNoteAllowed.status).toBe(201);

    await SchoolPolicy.findOneAndUpdate(
      { schoolId: tenantA.schoolId },
      { $set: { "teacherPermissions.canAddNotes": true } },
    );

    const teacherNoteAllowed = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send({ ...noteBody, text: "Allowed note" });
    expect(teacherNoteAllowed.status).toBe(201);

    const serveIncident = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ ...incidentBody, occurredAt: new Date(Date.now() + 2000).toISOString() });
    expect(serveIncident.status).toBe(201);

    const adminDetention = await Detention.findOne({ incidentId: serveIncident.body.data._id }).lean();

    const teacherServeForbidden = await request(app)
      .post(`/api/detentions/${adminDetention._id}/serve`)
      .set("Authorization", `Bearer ${tenantA.teacherToken}`);
    expect(teacherServeForbidden.status).toBe(403);

    const adminServeAllowed = await request(app)
      .post(`/api/detentions/${adminDetention._id}/serve`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(adminServeAllowed.status).toBe(200);

    const teacherServeIncident = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send({ ...incidentBody, occurredAt: new Date(Date.now() + 3000).toISOString() });
    expect(teacherServeIncident.status).toBe(201);

    const teacherDetention = await Detention.findOne({ incidentId: teacherServeIncident.body.data._id }).lean();
    await SchoolPolicy.findOneAndUpdate(
      { schoolId: tenantA.schoolId },
      { $set: { "teacherPermissions.canCompleteDetentions": true } },
    );

    const teacherServeAllowed = await request(app)
      .post(`/api/detentions/${teacherDetention._id}/serve`)
      .set("Authorization", `Bearer ${tenantA.teacherToken}`);
    expect(teacherServeAllowed.status).toBe(200);
  });

  test("rewards apply offsets oldest-first, auto-serve at zero, and create ledger records", async () => {
    const tenantA = await createSchoolFixture("G");
    await Category.findByIdAndUpdate(tenantA.behaviour._id, { detentionMinutes: 15 });
    await Category.findByIdAndUpdate(tenantA.reward._id, { rewardMinutes: 50 });
    await SchoolPolicy.findOneAndUpdate({ schoolId: tenantA.schoolId }, { rewardOffsetMinutes: 50 });

    const student = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ firstName: "Rae", lastName: "Ray", admissionNumber: "R-001", yearGroup: "Year 7", form: "7A" });

    for (let i = 0; i < 2; i += 1) {
      await request(app)
        .post("/api/incidents")
        .set("Authorization", `Bearer ${tenantA.adminToken}`)
        .send({ studentId: student.body.data._id, categoryId: tenantA.behaviour._id, occurredAt: new Date(Date.now() + i * 1000).toISOString() });
    }

    const detentionsBefore = await Detention.find({ studentId: student.body.data._id }).sort({ createdAt: 1 }).lean();
    expect(detentionsBefore[0].minutesRemaining).toBe(15);
    expect(detentionsBefore[1].minutesRemaining).toBe(15);

    const reward = await request(app)
      .post("/api/rewards")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ studentId: student.body.data._id, categoryId: tenantA.reward._id, notes: "Great behaviour" });
    expect(reward.status).toBe(201);

    const detentionsAfter = await Detention.find({ studentId: student.body.data._id }).sort({ createdAt: 1 }).lean();
    expect(detentionsAfter[0].minutesRemaining).toBe(0);
    expect(detentionsAfter[1].minutesRemaining).toBe(0);
    expect(detentionsAfter[0].status).toBe("served");
    expect(detentionsAfter[1].status).toBe("served");

    const offsets = await DetentionOffset.find({ studentId: student.body.data._id }).sort({ createdAt: 1 }).lean();
    expect(offsets).toHaveLength(2);
    expect(offsets[0].minutesApplied).toBe(15);
    expect(offsets[1].minutesApplied).toBe(15);

    const offsetList = await request(app)
      .get(`/api/offsets?studentId=${student.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(offsetList.status).toBe(200);
    expect(offsetList.body.meta.total).toBe(2);
  });

  test("notes entity validation + author/admin delete + isolation", async () => {
    const tenantA = await createSchoolFixture("H");
    const tenantB = await createSchoolFixture("I");

    const student = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ firstName: "Nia", lastName: "North", admissionNumber: "N-001", yearGroup: "Year 10", form: "10A" });

    const invalid = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({ entityType: "incident", entityId: student.body.data._id, text: "bad" });
    expect(invalid.status).toBe(400);

    const note = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${tenantA.teacherToken}`)
      .send({ entityType: "student", entityId: student.body.data._id, text: "Helpful note" });
    expect(note.status).toBe(201);

    const list = await request(app)
      .get(`/api/notes?entityType=student&entityId=${student.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);

    const otherTeacherHash = await User.hashPassword("password123");
    const otherTeacher = await User.create({
      schoolId: tenantA.schoolId,
      name: "No Delete",
      email: "nodelete@test.com",
      passwordHash: otherTeacherHash,
      role: "teacher",
    });
    const otherTeacherToken = signToken({ userId: otherTeacher._id, schoolId: tenantA.schoolId, role: "teacher" });

    const forbiddenDelete = await request(app)
      .delete(`/api/notes/${note.body.data._id}`)
      .set("Authorization", `Bearer ${otherTeacherToken}`);
    expect(forbiddenDelete.status).toBe(403);

    const adminDelete = await request(app)
      .delete(`/api/notes/${note.body.data._id}`)
      .set("Authorization", `Bearer ${tenantA.adminToken}`);
    expect(adminDelete.status).toBe(200);

    const crossTenant = await request(app)
      .get(`/api/notes?entityType=student&entityId=${student.body.data._id}`)
      .set("Authorization", `Bearer ${tenantB.adminToken}`);
    expect(crossTenant.body.meta.total).toBe(0);
  });
});
