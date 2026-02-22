const router = require("express").Router();

const mongoose = require("mongoose");

const School = require("../models/School");
const SchoolPolicy = require("../models/SchoolPolicy");
const User = require("../models/User");
const Student = require("../models/Student");
const Detention = require("../models/Detention");
const ParentStudentLink = require("../models/ParentStudentLink");
const Category = require("../models/Category");
const Incident = require("../models/Incident");
const Reward = require("../models/Reward");
const Note = require("../models/Note");
const DetentionOffset = require("../models/DetentionOffset");

const modelsInResetOrder = [
  DetentionOffset,
  Note,
  Reward,
  Incident,
  ParentStudentLink,
  Detention,
  Student,
  User,
  Category,
  SchoolPolicy,
  School,
];

const requireTestSecret = (req, res, next) => {
  const expected = process.env.E2E_RESET_SECRET || "detentiondesk-e2e-secret";
  const provided = req.headers["x-reset-secret"];

  if (provided !== expected) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  return next();
};

const resetDatabase = async () => {
  for (const model of modelsInResetOrder) {
    await model.deleteMany({});
  }
};

const seedDatabase = async () => {
  const school = await School.create({
    name: "E2E Academy",
    schoolCode: "E2E001",
  });

  await SchoolPolicy.create({
    schoolId: school._id,
    defaultDetentionMinutes: 30,
    rewardOffsetMinutes: 5,
  });

  const [adminPasswordHash, teacherPasswordHash, parentPasswordHash] = await Promise.all([
    User.hashPassword("AdminPass123!"),
    User.hashPassword("TeacherPass123!"),
    User.hashPassword("ParentPass123!"),
  ]);

  const admin = await User.create({
    schoolId: school._id,
    name: "Admin User",
    email: "admin.e2e@detentiondesk.test",
    passwordHash: adminPasswordHash,
    role: "schoolAdmin",
    status: "active",
  });

  const teacher = await User.create({
    schoolId: school._id,
    name: "Teacher User",
    email: "teacher.e2e@detentiondesk.test",
    passwordHash: teacherPasswordHash,
    role: "teacher",
    status: "active",
  });

  const parent = await User.create({
    schoolId: school._id,
    name: "Parent User",
    email: "parent.e2e@detentiondesk.test",
    passwordHash: parentPasswordHash,
    role: "parent",
    status: "active",
    mustChangePassword: false,
  });

  const student = await Student.create({
    schoolId: school._id,
    assignedTeacherId: teacher._id,
    firstName: "Jordan",
    lastName: "Miles",
    admissionNumber: "ADM-E2E-001",
    yearGroup: "8",
    form: "A",
    status: "active",
    createdBy: admin._id,
    updatedBy: admin._id,
  });

  await ParentStudentLink.create({
    schoolId: school._id,
    parentId: parent._id,
    studentId: student._id,
    relationshipType: "Guardian",
    status: "active",
    createdBy: admin._id,
  });

  await Detention.create({
    schoolId: school._id,
    studentId: student._id,
    assignedTeacherId: teacher._id,
    minutesAssigned: 30,
    minutesRemaining: 30,
    status: "pending",
    createdBy: admin._id,
  });

  return {
    schoolCode: school.schoolCode,
    admin: { email: admin.email, password: "AdminPass123!" },
    teacher: { email: teacher.email, password: "TeacherPass123!" },
    parent: { email: parent.email, password: "ParentPass123!" },
    student: { id: String(student._id), name: `${student.firstName} ${student.lastName}` },
  };
};

router.post("/reset", requireTestSecret, async (req, res) => {
  try {
    await resetDatabase();
    return res.json({ success: true, data: { reset: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Reset failed", error: error.message });
  }
});

router.post("/seed", requireTestSecret, async (req, res) => {
  try {
    await resetDatabase();
    const seed = await seedDatabase();
    return res.json({ success: true, data: seed });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Seed failed", error: error.message });
  }
});

router.get("/db-state", requireTestSecret, async (req, res) => {
  const collections = await mongoose.connection.db.collections();
  return res.json({ success: true, data: { collections: collections.map((item) => item.collectionName) } });
});

module.exports = router;
