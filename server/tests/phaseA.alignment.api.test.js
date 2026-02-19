const request = require("supertest");
const { buildApp } = require("../app");
const User = require("../models/User");
const Student = require("../models/Student");
const Category = require("../models/Category");
const Incident = require("../models/Incident");
const Reward = require("../models/Reward");
const Note = require("../models/Note");
const Detention = require("../models/Detention");
const { signToken } = require("../services/tokenService");
const SchoolPolicy = require("../models/SchoolPolicy");

const app = buildApp();

async function createSchoolFixture(prefix = "A") {
  const code = `${prefix}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const signup = await request(app).post("/signup/school").send({
    schoolName: `${prefix} School`,
    schoolCode: code,
    adminName: `${prefix} Admin`,
    adminEmail: `${prefix.toLowerCase()}admin@test.com`,
    adminPassword: "password123",
  });

  const adminUser = await User.findOne({ email: `${prefix.toLowerCase()}admin@test.com` });
  const hash = await User.hashPassword("password123");

  const teacherA = await User.create({
    schoolId: adminUser.schoolId,
    name: `${prefix} Teacher A`,
    email: `${prefix.toLowerCase()}teachera@test.com`,
    passwordHash: hash,
    role: "teacher",
    status: "active",
  });

  const teacherB = await User.create({
    schoolId: adminUser.schoolId,
    name: `${prefix} Teacher B`,
    email: `${prefix.toLowerCase()}teacherb@test.com`,
    passwordHash: hash,
    role: "teacher",
    status: "active",
  });

  const owner = await User.create({
    schoolId: null,
    name: `${prefix} Owner`,
    email: `${prefix.toLowerCase()}owner@test.com`,
    passwordHash: hash,
    role: "owner",
    status: "active",
  });

  const behaviour = await Category.findOne({ schoolId: adminUser.schoolId, type: "behaviour" });
  const reward = await Category.findOne({ schoolId: adminUser.schoolId, type: "reward" });

  return {
    schoolId: adminUser.schoolId,
    adminToken: signup.body.data.token,
    teacherAToken: signToken({ userId: teacherA._id, schoolId: adminUser.schoolId, role: "teacher" }),
    teacherBToken: signToken({ userId: teacherB._id, schoolId: adminUser.schoolId, role: "teacher" }),
    ownerToken: signToken({ userId: owner._id, schoolId: null, role: "owner" }),
    teacherA,
    teacherB,
    behaviour,
    reward,
  };
}

describe("Phase A backend alignment", () => {
  test("student assignment required and teacher create ignores assignedTeacherId", async () => {
    const fx = await createSchoolFixture("assign");

    const missing = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({ firstName: "No", lastName: "Teacher", admissionNumber: "M1", yearGroup: "Y7", form: "7A" });
    expect(missing.status).toBe(400);

    const created = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({ firstName: "With", lastName: "Teacher", admissionNumber: "M2", yearGroup: "Y7", form: "7A", assignedTeacherId: String(fx.teacherA._id) });
    expect(created.status).toBe(201);
    expect(String(created.body.data.assignedTeacherId)).toBe(String(fx.teacherA._id));

    const teacherCreated = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${fx.teacherBToken}`)
      .send({ firstName: "Teach", lastName: "Own", admissionNumber: "M3", yearGroup: "Y7", form: "7A", assignedTeacherId: String(fx.teacherA._id) });
    expect(teacherCreated.status).toBe(201);
    expect(String(teacherCreated.body.data.assignedTeacherId)).toBe(String(fx.teacherB._id));
  });

  test("teacher-scoped reads and admin full tenant reads", async () => {
    const fx = await createSchoolFixture("reads");
    const studentA = await Student.create({ schoolId: fx.schoolId, firstName: "A", lastName: "One", admissionNumber: "R1", yearGroup: "Y7", form: "7A", assignedTeacherId: fx.teacherA._id, createdBy: fx.teacherA._id });
    const studentB = await Student.create({ schoolId: fx.schoolId, firstName: "B", lastName: "Two", admissionNumber: "R2", yearGroup: "Y7", form: "7A", assignedTeacherId: fx.teacherB._id, createdBy: fx.teacherB._id });

    const listA = await request(app).get("/api/students").set("Authorization", `Bearer ${fx.teacherAToken}`);
    expect(listA.status).toBe(200);
    expect(listA.body.data).toHaveLength(1);
    expect(String(listA.body.data[0]._id)).toBe(String(studentA._id));

    const teacherDenied = await request(app)
      .get(`/api/students/${studentB._id}`)
      .set("Authorization", `Bearer ${fx.teacherAToken}`);
    expect(teacherDenied.status).toBe(404);

    const profileDenied = await request(app)
      .get(`/api/students/${studentB._id}/profile`)
      .set("Authorization", `Bearer ${fx.teacherAToken}`);
    expect(profileDenied.status).toBe(404);

    const adminList = await request(app).get("/api/students").set("Authorization", `Bearer ${fx.adminToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.meta.total).toBe(2);
  });

  test("teacher-scoped writes enforce ownership and copy assignedTeacherId", async () => {
    const fx = await createSchoolFixture("writes");
    const studentA = await Student.create({ schoolId: fx.schoolId, firstName: "A", lastName: "One", admissionNumber: "W1", yearGroup: "Y7", form: "7A", assignedTeacherId: fx.teacherA._id, createdBy: fx.teacherA._id });
    const studentB = await Student.create({ schoolId: fx.schoolId, firstName: "B", lastName: "Two", admissionNumber: "W2", yearGroup: "Y7", form: "7A", assignedTeacherId: fx.teacherB._id, createdBy: fx.teacherB._id });

    const deniedIncident = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${fx.teacherAToken}`)
      .send({ studentId: String(studentB._id), categoryId: String(fx.behaviour._id), occurredAt: new Date().toISOString() });
    expect(deniedIncident.status).toBe(403);

    const okIncident = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${fx.teacherAToken}`)
      .send({ studentId: String(studentA._id), categoryId: String(fx.behaviour._id), occurredAt: new Date().toISOString() });
    expect(okIncident.status).toBe(201);
    expect(String(okIncident.body.data.assignedTeacherId)).toBe(String(fx.teacherA._id));

    const deniedReward = await request(app)
      .post("/api/rewards")
      .set("Authorization", `Bearer ${fx.teacherAToken}`)
      .send({ studentId: String(studentB._id), categoryId: String(fx.reward._id) });
    expect(deniedReward.status).toBe(403);

    const okReward = await request(app)
      .post("/api/rewards")
      .set("Authorization", `Bearer ${fx.teacherAToken}`)
      .send({ studentId: String(studentA._id), categoryId: String(fx.reward._id) });
    expect(okReward.status).toBe(201);
    expect(String(okReward.body.data.reward.assignedTeacherId)).toBe(String(fx.teacherA._id));

    const deniedNote = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${fx.teacherAToken}`)
      .send({ entityType: "student", entityId: String(studentB._id), text: "x" });
    expect(deniedNote.status).toBe(403);

    const okNote = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${fx.teacherAToken}`)
      .send({ entityType: "student", entityId: String(studentA._id), text: "x" });
    expect(okNote.status).toBe(201);
    expect(String(okNote.body.data.assignedTeacherId)).toBe(String(fx.teacherA._id));

    await SchoolPolicy.findOneAndUpdate({ schoolId: fx.schoolId }, { $set: { "teacherPermissions.canCompleteDetentions": true } });

    const detention = await Detention.findOne({ studentId: studentA._id }).lean();
    const served = await request(app)
      .post(`/api/detentions/${detention._id}/serve`)
      .set("Authorization", `Bearer ${fx.teacherAToken}`);
    expect(served.status).toBe(200);

    const foreignDetention = await Detention.create({ schoolId: fx.schoolId, studentId: studentB._id, assignedTeacherId: fx.teacherB._id, minutesAssigned: 20, minutesRemaining: 20, status: "pending", createdBy: fx.teacherB._id });
    const deniedServe = await request(app)
      .post(`/api/detentions/${foreignDetention._id}/serve`)
      .set("Authorization", `Bearer ${fx.teacherAToken}`);
    expect(deniedServe.status).toBe(404);
  });

  test("admin teacher management, reassignment behavior, owner isolation, and teacher deactivation", async () => {
    const fx = await createSchoolFixture("admin");

    const createdTeacher = await request(app)
      .post("/api/admin/teachers")
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({ name: "New Teacher", email: "newteacher@test.com", password: "password123" });
    expect(createdTeacher.status).toBe(201);

    const list = await request(app)
      .get("/api/admin/teachers")
      .set("Authorization", `Bearer ${fx.adminToken}`);
    expect(list.status).toBe(200);

    const student = await Student.create({ schoolId: fx.schoolId, firstName: "Re", lastName: "Assign", admissionNumber: "A1", yearGroup: "Y7", form: "7A", assignedTeacherId: fx.teacherA._id, createdBy: fx.teacherA._id });
    await Incident.create({ schoolId: fx.schoolId, studentId: student._id, assignedTeacherId: fx.teacherA._id, categoryId: fx.behaviour._id, reportedBy: fx.teacherA._id, occurredAt: new Date() });

    const reassign = await request(app)
      .patch(`/api/admin/students/${student._id}/reassign`)
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({ assignedTeacherId: String(fx.teacherB._id) });
    expect(reassign.status).toBe(200);

    const teacherAAccess = await request(app)
      .get(`/api/students/${student._id}`)
      .set("Authorization", `Bearer ${fx.teacherAToken}`);
    expect(teacherAAccess.status).toBe(404);

    const teacherBAccess = await request(app)
      .get(`/api/students/${student._id}`)
      .set("Authorization", `Bearer ${fx.teacherBToken}`);
    expect(teacherBAccess.status).toBe(200);

    const incident = await Incident.findOne({ studentId: student._id }).lean();
    expect(String(incident.assignedTeacherId)).toBe(String(fx.teacherA._id));

    const deactivate = await request(app)
      .patch(`/api/admin/teachers/${fx.teacherB._id}/deactivate`)
      .set("Authorization", `Bearer ${fx.adminToken}`);
    expect(deactivate.status).toBe(200);

    const blocked = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${fx.teacherBToken}`);
    expect([401, 403]).toContain(blocked.status);

    const reactivate = await request(app)
      .patch(`/api/admin/teachers/${fx.teacherB._id}/reactivate`)
      .set("Authorization", `Bearer ${fx.adminToken}`);
    expect(reactivate.status).toBe(200);

    const restored = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${fx.teacherBToken}`);
    expect(restored.status).toBe(200);

    const ownerTeachers = await request(app)
      .get("/api/admin/teachers")
      .set("Authorization", `Bearer ${fx.ownerToken}`);
    expect(ownerTeachers.status).toBe(403);

    const ownerReassign = await request(app)
      .patch(`/api/admin/students/${student._id}/reassign`)
      .set("Authorization", `Bearer ${fx.ownerToken}`)
      .send({ assignedTeacherId: String(fx.teacherA._id) });
    expect(ownerReassign.status).toBe(403);

    const ownerTenantStudent = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${fx.ownerToken}`);
    expect(ownerTenantStudent.status).toBe(403);
  });
});
