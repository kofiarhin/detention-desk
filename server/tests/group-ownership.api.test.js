const request = require("supertest");

const { buildApp } = require("../app");
const { signToken } = require("../services/tokenService");
const User = require("../models/User");
const Group = require("../models/Group");

const app = buildApp();

async function createFixture(prefix = "GO") {
  const signup = await request(app).post("/signup/school").send({
    schoolName: `${prefix} School`,
    adminName: `${prefix} Admin`,
    adminEmail: `${prefix.toLowerCase()}-admin@test.com`,
    adminPassword: "password123",
  });

  expect(signup.status).toBe(201);

  const adminToken = signup.body.data.token;
  const adminUser = await User.findOne({ email: `${prefix.toLowerCase()}-admin@test.com` }).lean();

  return { adminToken, schoolId: adminUser.schoolId };
}

describe("Group ownership student access", () => {
  test("teacher ownership drives student assignment and visibility", async () => {
    const fx = await createFixture("GOA");

    const groupsRes = await request(app)
      .get("/api/admin/groups")
      .set("Authorization", `Bearer ${fx.adminToken}`);

    expect(groupsRes.status).toBe(200);
    expect(groupsRes.body.data.length).toBeGreaterThan(0);

    const targetGroup = groupsRes.body.data.find((group) => group.code === "Y7A");

    const createTeacher = await request(app)
      .post("/api/admin/teachers")
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({
        name: "Teacher One",
        email: "teacher-one@test.com",
        password: "password123",
        groupId: targetGroup._id,
      });

    expect(createTeacher.status).toBe(201);
    expect(createTeacher.body.data.ownedGroup.id).toBe(String(targetGroup._id));

    const duplicateTeacher = await request(app)
      .post("/api/admin/teachers")
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({
        name: "Teacher Duplicate",
        email: "teacher-duplicate@test.com",
        password: "password123",
        groupId: targetGroup._id,
      });

    expect(duplicateTeacher.status).toBe(409);

    const createStudent = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({
        firstName: "Sam",
        lastName: "Student",
        admissionNumber: "GO-1",
        groupId: targetGroup._id,
      });

    expect(createStudent.status).toBe(201);
    expect(createStudent.body.data.groupId._id).toBe(String(targetGroup._id));
    expect(String(createStudent.body.data.assignedTeacherId)).toBe(String(createTeacher.body.data.id));

    const teacherOneToken = signToken({
      userId: createTeacher.body.data.id,
      schoolId: fx.schoolId,
      role: "teacher",
    });

    const teacherOneList = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${teacherOneToken}`);
    expect(teacherOneList.status).toBe(200);
    expect(teacherOneList.body.data).toHaveLength(1);

    const passwordHash = await User.hashPassword("password123");
    const teacherTwo = await User.create({
      schoolId: fx.schoolId,
      name: "Teacher Two",
      email: "teacher-two@test.com",
      passwordHash,
      role: "teacher",
      status: "active",
    });

    const reassign = await request(app)
      .patch(`/api/admin/groups/${targetGroup._id}/assign-owner`)
      .set("Authorization", `Bearer ${fx.adminToken}`)
      .send({ ownerTeacherId: String(teacherTwo._id) });

    expect(reassign.status).toBe(200);
    expect(String(reassign.body.data.ownerTeacherId._id)).toBe(String(teacherTwo._id));

    const teacherOneAfter = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${teacherOneToken}`);
    expect(teacherOneAfter.status).toBe(200);
    expect(teacherOneAfter.body.data).toHaveLength(0);

    const teacherTwoToken = signToken({
      userId: teacherTwo._id,
      schoolId: fx.schoolId,
      role: "teacher",
    });

    const teacherTwoAfter = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${teacherTwoToken}`);
    expect(teacherTwoAfter.status).toBe(200);
    expect(teacherTwoAfter.body.data).toHaveLength(1);

    const updatedGroup = await Group.findById(targetGroup._id).lean();
    expect(String(updatedGroup.ownerTeacherId)).toBe(String(teacherTwo._id));
  });
});
