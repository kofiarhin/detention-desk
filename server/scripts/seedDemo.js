/* eslint-disable no-console */
require("dotenv").config();

const mongoose = require("mongoose");
const crypto = require("crypto");

const { connectDB } = require("../config/db");

const School = require("../models/School");
const SchoolPolicy = require("../models/SchoolPolicy");
const Category = require("../models/Category");
const User = require("../models/User");
const Student = require("../models/Student");
const Incident = require("../models/Incident");
const Detention = require("../models/Detention");
const Reward = require("../models/Reward");
const DetentionOffset = require("../models/DetentionOffset");
const Note = require("../models/Note");
const ParentStudentLink = require("../models/ParentStudentLink");

const { seedDefaultCategories } = require("../services/seedService");
const {
  getIncidentDetentionMinutes,
  createDetentionForIncident,
} = require("../services/detentionService");
const {
  getRewardMinutes,
  createRewardAndApplyOffsets,
} = require("../services/rewardService");

function randPassword(len = 12) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len);
}

function nowMinusDays(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function nowPlusDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function wipeTenant(schoolId) {
  await Promise.all([
    Category.deleteMany({ schoolId }),
    SchoolPolicy.deleteMany({ schoolId }),
    ParentStudentLink.deleteMany({ schoolId }),
    Note.deleteMany({ schoolId }),
    DetentionOffset.deleteMany({ schoolId }),
    Reward.deleteMany({ schoolId }),
    Detention.deleteMany({ schoolId }),
    Incident.deleteMany({ schoolId }),
    Student.deleteMany({ schoolId }),
    User.deleteMany({ schoolId }),
  ]);
  await School.deleteOne({ _id: schoolId });
}

async function main() {
  const SCHOOL_CODE = process.env.SEED_SCHOOL_CODE || "DEMO";
  const RESET = String(process.env.SEED_RESET || "").toLowerCase() === "true";

  await connectDB();

  const existing = await School.findOne({
    schoolCodeNormalized: String(SCHOOL_CODE).trim().toUpperCase(),
  }).lean();
  if (existing) {
    if (!RESET) {
      console.log(
        `[seed] School ${SCHOOL_CODE} already exists. Set SEED_RESET=true to recreate.`,
      );
      process.exit(0);
    }
    console.log(`[seed] Resetting existing demo school ${SCHOOL_CODE}...`);
    await wipeTenant(existing._id);
  }

  // 1) Create School
  const school = await School.create({
    name: "DetentionDesk Demo School",
    schoolCode: SCHOOL_CODE,
  });

  // 2) Policy
  await SchoolPolicy.create({
    schoolId: school._id,
    defaultDetentionMinutes: 30,
    rewardOffsetMinutes: 5,
    teacherPermissions: {
      canCreateIncidents: true,
      canCreateRewards: true,
      canCompleteDetentions: false,
      canDeleteDetentions: false,
      canAddNotes: true,
      canEditOwnNotes: true,
      canViewAllStudents: false,
    },
  });

  // 3) Seed default categories + add minutes to a couple for richer testing
  await seedDefaultCategories({ schoolId: school._id });

  // Add explicit minutes to some categories for deterministic tests
  const behaviourCats = await Category.find({
    schoolId: school._id,
    type: "behaviour",
  })
    .sort({ sortOrder: 1 })
    .exec();
  const rewardCats = await Category.find({
    schoolId: school._id,
    type: "reward",
  })
    .sort({ sortOrder: 1 })
    .exec();

  if (behaviourCats[0]) {
    await Category.updateOne(
      { _id: behaviourCats[0]._id },
      { $set: { detentionMinutes: 20 } },
    );
  }
  if (behaviourCats[1]) {
    await Category.updateOne(
      { _id: behaviourCats[1]._id },
      { $set: { detentionMinutes: 30 } },
    );
  }
  if (behaviourCats[2]) {
    await Category.updateOne(
      { _id: behaviourCats[2]._id },
      { $set: { detentionMinutes: 45 } },
    );
  }

  if (rewardCats[0]) {
    await Category.updateOne(
      { _id: rewardCats[0]._id },
      { $set: { rewardMinutes: 10 } },
    );
  }
  if (rewardCats[1]) {
    await Category.updateOne(
      { _id: rewardCats[1]._id },
      { $set: { rewardMinutes: 5 } },
    );
  }

  const behaviourCategories = await Category.find({
    schoolId: school._id,
    type: "behaviour",
    isActive: true,
  })
    .sort({ sortOrder: 1 })
    .lean();
  const rewardCategories = await Category.find({
    schoolId: school._id,
    type: "reward",
    isActive: true,
  })
    .sort({ sortOrder: 1 })
    .lean();

  // 4) Create Users
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Passw0rd!Demo";
  const admin = await User.create({
    schoolId: school._id,
    name: "Demo Admin",
    email: process.env.SEED_ADMIN_EMAIL || "admin@demo.school",
    passwordHash: await User.hashPassword(adminPassword),
    role: "schoolAdmin",
    status: "active",
    mustChangePassword: false,
  });

  const teacherCreds = [
    {
      name: "Teacher One",
      email: "teacher1@demo.school",
      password: "Passw0rd!T1",
      status: "active",
    },
    {
      name: "Teacher Two",
      email: "teacher2@demo.school",
      password: "Passw0rd!T2",
      status: "active",
    },
    {
      name: "Teacher Three",
      email: "teacher3@demo.school",
      password: "Passw0rd!T3",
      status: "active",
    },
    {
      name: "Teacher Inactive",
      email: "teacher4@demo.school",
      password: "Passw0rd!T4",
      status: "inactive",
    },
  ];

  const teachers = [];
  for (const t of teacherCreds) {
    teachers.push(
      await User.create({
        schoolId: school._id,
        name: t.name,
        email: t.email,
        passwordHash: await User.hashPassword(t.password),
        role: "teacher",
        status: t.status,
        mustChangePassword: false,
      }),
    );
  }

  const activeTeachers = teachers.filter((t) => t.status === "active");

  // 5) Create Students (30, evenly assigned)
  const firstNames = [
    "Ava",
    "Noah",
    "Mia",
    "Liam",
    "Zoe",
    "Ethan",
    "Ivy",
    "Lucas",
    "Nina",
    "Kai",
  ];
  const lastNames = [
    "Mensah",
    "Owusu",
    "Boateng",
    "Agyeman",
    "Addo",
    "Tetteh",
    "Asare",
    "Ofori",
    "Amoah",
    "Quaye",
  ];
  const yearGroups = ["7", "8", "9", "10", "11"];
  const forms = ["A", "B", "C", "D"];

  const students = [];
  for (let i = 0; i < 30; i++) {
    const teacher = activeTeachers[i % activeTeachers.length];
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i * 3) % lastNames.length];
    const admissionNumber = `ADM${String(i + 1).padStart(3, "0")}`;
    const yearGroup = yearGroups[i % yearGroups.length];
    const form = forms[i % forms.length];

    students.push(
      await Student.create({
        schoolId: school._id,
        assignedTeacherId: teacher._id,
        firstName,
        lastName,
        admissionNumber,
        yearGroup,
        form,
        status: "active",
        createdBy: admin._id,
        updatedBy: null,
      }),
    );
  }

  // 6) Create incidents + detentions across 12 students
  const seededIncidents = [];
  const seededDetentions = [];

  for (let i = 0; i < 12; i++) {
    const student = students[i];
    const assignedTeacherId = student.assignedTeacherId;
    const reporter =
      i % 3 === 0 ? admin : activeTeachers[i % activeTeachers.length];
    const category = behaviourCategories[i % behaviourCategories.length];

    const occurredAt = nowMinusDays(14 - i);
    const incident = await Incident.create({
      schoolId: school._id,
      studentId: student._id,
      assignedTeacherId,
      categoryId: category._id,
      reportedBy: reporter._id,
      notes: `Seeded incident for manual testing (#${i + 1})`,
      occurredAt,
      severity: i % 4 === 0 ? "high" : i % 4 === 1 ? "medium" : "low",
      status: "open",
    });

    seededIncidents.push(incident);

    const minutes = await getIncidentDetentionMinutes({
      schoolId: school._id,
      categoryId: category._id,
    });
    const detention = await createDetentionForIncident({
      schoolId: school._id,
      studentId: student._id,
      assignedTeacherId,
      incidentId: incident._id,
      createdBy: reporter._id,
      minutes: minutes || 30,
    });

    seededDetentions.push(detention);

    // Notes on incident (some visible to parent)
    await Note.create({
      schoolId: school._id,
      studentId: student._id,
      assignedTeacherId,
      entityType: "incident",
      entityId: incident._id,
      text: `Incident note: context for manual testing (#${i + 1}).`,
      visibleToParent: i % 2 === 0,
      authorId: reporter._id,
    });
  }

  // 7) Mutate detention statuses for realistic dashboard & workflow tests
  // - 3 scheduled future
  // - 3 served
  // - 2 voided
  // - rest remain pending
  for (let i = 0; i < seededDetentions.length; i++) {
    const d = await Detention.findById(seededDetentions[i]._id).exec();
    if (!d) continue;

    if (i < 3) {
      d.status = "scheduled";
      d.scheduledFor = nowPlusDays(2 + i);
      await d.save();
    } else if (i < 6) {
      d.status = "served";
      d.minutesRemaining = 0;
      d.servedAt = nowMinusDays(2 + i);
      d.servedBy = admin._id;
      await d.save();
    } else if (i < 8) {
      d.status = "voided";
      await d.save();
    } else {
      // keep pending
      await d.save();
    }

    // Note on detention
    await Note.create({
      schoolId: school._id,
      studentId: d.studentId,
      assignedTeacherId: d.assignedTeacherId,
      entityType: "detention",
      entityId: d._id,
      text: `Detention note: status=${d.status} seeded for manual testing.`,
      visibleToParent: i % 3 === 0,
      authorId: admin._id,
    });
  }

  // 8) Rewards + offsets (apply to pending detentions oldest-first)
  // Pick 6 students that still have pending detentions and apply rewards
  const rewardSeedTargets = students.slice(6, 12);
  const seededRewards = [];

  for (let i = 0; i < rewardSeedTargets.length; i++) {
    const student = rewardSeedTargets[i];
    const assignedTeacherId = student.assignedTeacherId;
    const awardedBy =
      i % 2 === 0 ? admin : activeTeachers[i % activeTeachers.length];
    const category = rewardCategories[i % rewardCategories.length];

    const computed = await getRewardMinutes({
      schoolId: school._id,
      categoryId: category._id,
    });
    const minutesAwarded = Number.isFinite(computed) ? computed : 5;

    const { reward } = await createRewardAndApplyOffsets({
      schoolId: school._id,
      studentId: student._id,
      assignedTeacherId,
      categoryId: category._id,
      notes: `Seeded reward for offsets testing (#${i + 1})`,
      awardedBy: awardedBy._id,
      awardedAt: nowMinusDays(3 + i),
      minutesAwarded,
    });

    seededRewards.push(reward);

    await Note.create({
      schoolId: school._id,
      studentId: student._id,
      assignedTeacherId,
      entityType: "reward",
      entityId: reward._id,
      text: `Reward note: applied ${minutesAwarded} minutes.`,
      visibleToParent: true,
      authorId: awardedBy._id,
    });
  }

  // 9) Notes directly on student
  for (let i = 0; i < 8; i++) {
    const student = students[i];
    const author =
      i % 2 === 0 ? admin : activeTeachers[i % activeTeachers.length];
    await Note.create({
      schoolId: school._id,
      studentId: student._id,
      assignedTeacherId: student.assignedTeacherId,
      entityType: "student",
      entityId: student._id,
      text: `Student note: seeded profile note (#${i + 1}).`,
      visibleToParent: i % 3 === 0,
      authorId: author._id,
    });
  }

  // 10) Parent user + links (2 active, 1 revoked)
  const parentTempPassword = randPassword(12);

  const parent = await User.create({
    schoolId: school._id,
    name: "Demo Parent",
    email: "parent@demo.school",
    passwordHash: await User.hashPassword(parentTempPassword),
    role: "parent",
    status: "active",
    mustChangePassword: true,
  });

  const parentStudents = [students[0], students[1], students[2]];

  await ParentStudentLink.create({
    schoolId: school._id,
    parentId: parent._id,
    studentId: parentStudents[0]._id,
    relationshipType: "mother",
    status: "active",
    createdBy: admin._id,
    verifiedAt: null,
  });

  await ParentStudentLink.create({
    schoolId: school._id,
    parentId: parent._id,
    studentId: parentStudents[1]._id,
    relationshipType: "father",
    status: "active",
    createdBy: admin._id,
    verifiedAt: null,
  });

  await ParentStudentLink.create({
    schoolId: school._id,
    parentId: parent._id,
    studentId: parentStudents[2]._id,
    relationshipType: "guardian",
    status: "revoked",
    createdBy: admin._id,
    verifiedAt: null,
  });

  // Summary
  const counts = await Promise.all([
    Category.countDocuments({ schoolId: school._id }),
    User.countDocuments({ schoolId: school._id }),
    Student.countDocuments({ schoolId: school._id }),
    Incident.countDocuments({ schoolId: school._id }),
    Detention.countDocuments({ schoolId: school._id }),
    Reward.countDocuments({ schoolId: school._id }),
    DetentionOffset.countDocuments({ schoolId: school._id }),
    Note.countDocuments({ schoolId: school._id }),
    ParentStudentLink.countDocuments({ schoolId: school._id }),
  ]);

  console.log("\n[seed] ✅ Demo tenant created\n");
  console.log(`School: ${school.name}`);
  console.log(`School Code: ${school.schoolCode}`);
  console.log("\nLogins:");
  console.log(
    `Admin -> schoolCode=${school.schoolCode} email=${admin.email} password=${adminPassword}`,
  );
  console.log(
    `Teacher1 -> email=${teacherCreds[0].email} password=${teacherCreds[0].password}`,
  );
  console.log(
    `Teacher2 -> email=${teacherCreds[1].email} password=${teacherCreds[1].password}`,
  );
  console.log(
    `Teacher3 -> email=${teacherCreds[2].email} password=${teacherCreds[2].password}`,
  );
  console.log(
    `TeacherInactive -> email=${teacherCreds[3].email} password=${teacherCreds[3].password}`,
  );
  console.log(
    `Parent -> email=${parent.email} tempPassword=${parentTempPassword} (mustChangePassword=true)`,
  );

  console.log("\nCounts:");
  console.log(`Categories: ${counts[0]}`);
  console.log(`Users: ${counts[1]}`);
  console.log(`Students: ${counts[2]}`);
  console.log(`Incidents: ${counts[3]}`);
  console.log(`Detentions: ${counts[4]}`);
  console.log(`Rewards: ${counts[5]}`);
  console.log(`Offsets: ${counts[6]}`);
  console.log(`Notes: ${counts[7]}`);
  console.log(`Parent Links: ${counts[8]}`);

  await mongoose.disconnect();
  console.log("\n[seed] done\n");
}

main().catch(async (err) => {
  console.error("[seed] fatal:", err);
  try {
    await mongoose.disconnect();
  } catch (e) {}
  process.exit(1);
});
