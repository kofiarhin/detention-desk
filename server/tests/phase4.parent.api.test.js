const request = require("supertest");

const { buildApp } = require("../app");
const Category = require("../models/Category");
const Incident = require("../models/Incident");
const Note = require("../models/Note");
const ParentStudentLink = require("../models/ParentStudentLink");
const Student = require("../models/Student");
const User = require("../models/User");
const { signToken } = require("../services/tokenService");

const app = buildApp();

async function createSchoolFixture(prefix = "P") {
  const signup = await request(app).post("/signup/school").send({
    schoolName: `${prefix} School`,
    adminName: `${prefix} Admin`,
    adminEmail: `${prefix.toLowerCase()}-admin@test.com`,
    adminPassword: "password123",
  });

  expect(signup.status).toBe(201);

  const adminUser = await User.findOne({ email: `${prefix.toLowerCase()}-admin@test.com` });
  const behaviour = await Category.findOne({ schoolId: adminUser.schoolId, type: "behaviour" });

  const teacherHash = await User.hashPassword("password123");
  const teacher = await User.create({
    schoolId: adminUser.schoolId,
    name: `${prefix} Teacher`,
    email: `${prefix.toLowerCase()}-teacher@test.com`,
    passwordHash: teacherHash,
    role: "teacher",
    status: "active",
  });

  return {
    schoolId: String(adminUser.schoolId),
    adminToken: signup.body.data.token,
    adminUser,
    behaviour,
    teacher,
  };
}

describe("Phase 4 Parent API", () => {
  test("admin creates parent link, parent must change password, access control and revocation", async () => {
    const tenant = await createSchoolFixture("P1");

    const student = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenant.adminToken}`)
      .send({
        firstName: "Lia",
        lastName: "Lane",
        admissionNumber: "P1-001",
        yearGroup: "Year 9",
        form: "9A",
        assignedTeacherId: String(tenant.teacher._id),
      });

    expect(student.status).toBe(201);

    const createParent = await request(app)
      .post("/api/admin/parents")
      .set("Authorization", `Bearer ${tenant.adminToken}`)
      .send({
        studentId: student.body.data._id,
        parentName: "Parent One",
        email: " Parent1@Test.com ",
        relationshipType: "guardian",
        schoolId: "bad-input-ignored",
      });

    expect(createParent.status).toBe(201);
    expect(createParent.body.data.parent.role).toBe("parent");
    expect(createParent.body.data.parent.mustChangePassword).toBe(true);
    expect(createParent.body.data.parent).not.toHaveProperty("temporaryPassword");
    expect(createParent.body.data).not.toHaveProperty("temporaryPassword");

    const parent = await User.findOne({ email: "parent1@test.com" });
    expect(parent).toBeTruthy();
    expect(parent.mustChangePassword).toBe(true);

    const parentToken = signToken({
      userId: parent._id,
      schoolId: parent.schoolId,
      role: parent.role,
    });

    const blockedStudentsBeforeChange = await request(app)
      .get("/api/parent/students")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(blockedStudentsBeforeChange.status).toBe(403);
    expect(blockedStudentsBeforeChange.body).toEqual({
      message: "Password change required",
      code: "PASSWORD_RESET_REQUIRED",
      details: {},
    });

    const meAllowed = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(meAllowed.status).toBe(200);

    const changePassword = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ currentPassword: "wrong", newPassword: "new-password-123" });
    expect(changePassword.status).toBe(401);

    const reloadedParent = await User.findById(parent._id);
    reloadedParent.passwordHash = await User.hashPassword("TempPass123!");
    await reloadedParent.save();

    const changePasswordOk = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ currentPassword: "TempPass123!", newPassword: "new-password-123" });
    expect(changePasswordOk.status).toBe(200);

    const parentAfterPassword = await User.findById(parent._id).lean();
    expect(parentAfterPassword.mustChangePassword).toBe(false);

    const studentIncident = await Incident.create({
      schoolId: tenant.schoolId,
      studentId: student.body.data._id,
      categoryId: tenant.behaviour._id,
      reportedBy: tenant.adminUser._id,
      occurredAt: new Date("2024-01-01T10:00:00.000Z"),
      notes: "Incident",
    });

    await Note.create({
      schoolId: tenant.schoolId,
      entityType: "student",
      entityId: student.body.data._id,
      text: "Hidden from parent",
      visibleToParent: false,
      authorId: tenant.adminUser._id,
    });

    await Note.create({
      schoolId: tenant.schoolId,
      entityType: "student",
      entityId: student.body.data._id,
      text: "Visible to parent",
      visibleToParent: true,
      authorId: tenant.adminUser._id,
    });

    const parentStudents = await request(app)
      .get("/api/parent/students")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(parentStudents.status).toBe(200);
    expect(parentStudents.body.data).toHaveLength(1);
    expect(parentStudents.body.data[0]._id).toBe(student.body.data._id);

    const parentStudentDetail = await request(app)
      .get(`/api/parent/students/${student.body.data._id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(parentStudentDetail.status).toBe(200);

    const timeline = await request(app)
      .get(`/api/parent/students/${student.body.data._id}/timeline`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(timeline.status).toBe(200);
    expect(timeline.body.data.some((item) => item.type === "incident" && item.item._id === String(studentIncident._id))).toBe(true);
    expect(timeline.body.data.some((item) => item.type === "note" && item.item.text === "Visible to parent")).toBe(true);
    expect(timeline.body.data.some((item) => item.type === "note" && item.item.text === "Hidden from parent")).toBe(false);

    const parentMutateBlocked = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({
        studentId: student.body.data._id,
        categoryId: tenant.behaviour._id,
        occurredAt: new Date().toISOString(),
      });
    expect(parentMutateBlocked.status).toBe(403);

    const secondStudent = await Student.create({
      schoolId: tenant.schoolId,
      firstName: "Una",
      lastName: "Linked",
      admissionNumber: "P1-002",
      yearGroup: "Year 9",
      form: "9B",
      createdBy: tenant.adminUser._id,
    });

    const unlinkedAccess = await request(app)
      .get(`/api/parent/students/${secondStudent._id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(unlinkedAccess.status).toBe(403);

    const revoke = await request(app)
      .patch(`/api/admin/parent-links/${createParent.body.data.link.id}/revoke`)
      .set("Authorization", `Bearer ${tenant.adminToken}`);
    expect(revoke.status).toBe(200);
    expect(revoke.body.data.status).toBe("revoked");

    const blockedAfterRevoke = await request(app)
      .get(`/api/parent/students/${student.body.data._id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(blockedAfterRevoke.status).toBe(403);

    const linkDoc = await ParentStudentLink.findById(createParent.body.data.link.id).lean();
    expect(linkDoc.status).toBe("revoked");
  });

  test("cross-tenant access blocked and owner token blocked from parent routes", async () => {
    const tenantA = await createSchoolFixture("P2A");
    const tenantB = await createSchoolFixture("P2B");

    const studentA = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({
        firstName: "Ten",
        lastName: "A",
        admissionNumber: "P2A-001",
        yearGroup: "Year 8",
        form: "8A",
        assignedTeacherId: String(tenantA.teacher._id),
      });
    expect(studentA.status).toBe(201);

    const createParent = await request(app)
      .post("/api/admin/parents")
      .set("Authorization", `Bearer ${tenantA.adminToken}`)
      .send({
        studentId: studentA.body.data._id,
        parentName: "Tenant A Parent",
        email: "tenanta-parent@test.com",
      });
    expect(createParent.status).toBe(201);

    const parentA = await User.findOne({ email: "tenanta-parent@test.com" });
    parentA.passwordHash = await User.hashPassword("temp-pass-a");
    parentA.mustChangePassword = false;
    await parentA.save();

    const parentToken = signToken({
      userId: parentA._id,
      schoolId: parentA.schoolId,
      role: parentA.role,
    });

    const tenantBStudent = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tenantB.adminToken}`)
      .send({
        firstName: "Ten",
        lastName: "B",
        admissionNumber: "P2B-001",
        yearGroup: "Year 8",
        form: "8B",
        assignedTeacherId: String(tenantB.teacher._id),
      });
    expect(tenantBStudent.status).toBe(201);

    const crossTenantStudentAccess = await request(app)
      .get(`/api/parent/students/${tenantBStudent.body.data._id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(crossTenantStudentAccess.status).toBe(403);

    const ownerBoot = await request(app)
      .post("/auth/owner/bootstrap")
      .set("x-bootstrap-secret", process.env.OWNER_BOOTSTRAP_SECRET)
      .send({ name: "Owner", email: "phase4-owner@test.com", password: "password123" });
    expect(ownerBoot.status).toBe(201);

    const ownerLogin = await request(app)
      .post("/auth/owner/login")
      .send({ email: "phase4-owner@test.com", password: "password123" });
    expect(ownerLogin.status).toBe(200);

    const ownerBlocked = await request(app)
      .get("/api/parent/students")
      .set("Authorization", `Bearer ${ownerLogin.body.data.token}`);
    expect(ownerBlocked.status).toBe(403);
  });
});
