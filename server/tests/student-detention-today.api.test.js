const request = require("supertest");

const { buildApp } = require("../app");
const User = require("../models/User");
const Detention = require("../models/Detention");

const app = buildApp();

async function createSchoolFixture(prefix) {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const schoolCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  const signupRes = await request(app).post("/signup/school").send({
    schoolName: `${prefix} School`,
    schoolCode,
    adminName: `${prefix} Admin`,
    adminEmail: `${prefix.toLowerCase()}-admin@dettest.com`,
    adminPassword: "password123",
  });

  expect(signupRes.status).toBe(201);

  const adminToken = signupRes.body.data.token;
  const adminUser = await User.findOne({ email: `${prefix.toLowerCase()}-admin@dettest.com` });

  // Create students via API so groupId is resolved automatically
  const s1Res = await request(app)
    .post("/api/students")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: `${prefix}First`,
      lastName: "Student",
      admissionNumber: `${prefix}-001`,
      yearGroup: "Year 9",
      form: "9A",
    });
  expect(s1Res.status).toBe(201);
  const student = s1Res.body.data;

  const s2Res = await request(app)
    .post("/api/students")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: `${prefix}Second`,
      lastName: "Student",
      admissionNumber: `${prefix}-002`,
      yearGroup: "Year 9",
      form: "9B",
    });
  expect(s2Res.status).toBe(201);
  const studentNoDetention = s2Res.body.data;

  return {
    schoolId: adminUser.schoolId,
    adminToken,
    adminUser,
    student,
    studentNoDetention,
  };
}

function todayScheduledFor() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

function tomorrowScheduledFor() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

describe("GET /api/students?includeDetentionToday", () => {
  test("returns detentionToday: true for student with scheduled detention today", async () => {
    const school = await createSchoolFixture("DT1");

    await Detention.create({
      schoolId: school.schoolId,
      studentId: school.student._id,
      minutesAssigned: 30,
      minutesRemaining: 30,
      status: "scheduled",
      scheduledFor: todayScheduledFor(),
      createdBy: school.adminUser._id,
    });

    const res = await request(app)
      .get(`/api/students?includeDetentionToday=true`)
      .set("Authorization", `Bearer ${school.adminToken}`);

    expect(res.status).toBe(200);

    const withDetention = res.body.data.find((s) => String(s._id) === String(school.student._id));
    const withoutDetention = res.body.data.find((s) => String(s._id) === String(school.studentNoDetention._id));

    expect(withDetention).toBeDefined();
    expect(withDetention.detentionToday).toBe(true);

    expect(withoutDetention).toBeDefined();
    expect(withoutDetention.detentionToday).toBe(false);
  });

  test("returns detentionToday: false when detention is scheduled for tomorrow", async () => {
    const school = await createSchoolFixture("DT2");

    await Detention.create({
      schoolId: school.schoolId,
      studentId: school.student._id,
      minutesAssigned: 30,
      minutesRemaining: 30,
      status: "scheduled",
      scheduledFor: tomorrowScheduledFor(),
      createdBy: school.adminUser._id,
    });

    const res = await request(app)
      .get(`/api/students?includeDetentionToday=true`)
      .set("Authorization", `Bearer ${school.adminToken}`);

    expect(res.status).toBe(200);

    const student = res.body.data.find((s) => String(s._id) === String(school.student._id));
    expect(student).toBeDefined();
    expect(student.detentionToday).toBe(false);
  });

  test("returns detentionToday: false when detention status is pending (not scheduled)", async () => {
    const school = await createSchoolFixture("DT3");

    await Detention.create({
      schoolId: school.schoolId,
      studentId: school.student._id,
      minutesAssigned: 30,
      minutesRemaining: 30,
      status: "pending",
      scheduledFor: todayScheduledFor(),
      createdBy: school.adminUser._id,
    });

    const res = await request(app)
      .get(`/api/students?includeDetentionToday=true`)
      .set("Authorization", `Bearer ${school.adminToken}`);

    expect(res.status).toBe(200);

    const student = res.body.data.find((s) => String(s._id) === String(school.student._id));
    expect(student).toBeDefined();
    expect(student.detentionToday).toBe(false);
  });

  test("does not include detentionToday field when param is absent", async () => {
    const school = await createSchoolFixture("DT4");

    await Detention.create({
      schoolId: school.schoolId,
      studentId: school.student._id,
      minutesAssigned: 30,
      minutesRemaining: 30,
      status: "scheduled",
      scheduledFor: todayScheduledFor(),
      createdBy: school.adminUser._id,
    });

    const res = await request(app)
      .get(`/api/students`)
      .set("Authorization", `Bearer ${school.adminToken}`);

    expect(res.status).toBe(200);

    for (const s of res.body.data) {
      expect(Object.prototype.hasOwnProperty.call(s, "detentionToday")).toBe(false);
    }
  });

  test("returns 400 for invalid includeDetentionToday value", async () => {
    const school = await createSchoolFixture("DT5");

    const res = await request(app)
      .get(`/api/students?includeDetentionToday=banana`)
      .set("Authorization", `Bearer ${school.adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("tenant isolation: school A's detention does not affect school B's detentionToday flag", async () => {
    const schoolA = await createSchoolFixture("DTA");
    const schoolB = await createSchoolFixture("DTB");

    // Give school A's student a detention today
    await Detention.create({
      schoolId: schoolA.schoolId,
      studentId: schoolA.student._id,
      minutesAssigned: 30,
      minutesRemaining: 30,
      status: "scheduled",
      scheduledFor: todayScheduledFor(),
      createdBy: schoolA.adminUser._id,
    });

    // School B queries with the flag — should see no today badges
    const res = await request(app)
      .get(`/api/students?includeDetentionToday=true`)
      .set("Authorization", `Bearer ${schoolB.adminToken}`);

    expect(res.status).toBe(200);

    for (const s of res.body.data) {
      expect(s.detentionToday).toBe(false);
    }
  });

  test("includeDetentionToday=false is accepted and does not attach detentionToday field", async () => {
    const school = await createSchoolFixture("DT6");

    const res = await request(app)
      .get(`/api/students?includeDetentionToday=false`)
      .set("Authorization", `Bearer ${school.adminToken}`);

    expect(res.status).toBe(200);

    for (const s of res.body.data) {
      expect(Object.prototype.hasOwnProperty.call(s, "detentionToday")).toBe(false);
    }
  });
});
