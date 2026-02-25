/* eslint-disable no-console */
const mongoose = require("mongoose");

const { loadEnv } = require("../config/env");
const { connectDB } = require("../config/db");
const Group = require("../models/Group");
const Student = require("../models/Student");
const {
  findOrCreateGroupByLegacyFields,
  ensureSchoolGroups,
} = require("../services/groupService");

const run = async () => {
  loadEnv();
  await connectDB();

  const schoolIds = await Student.distinct("schoolId");

  for (const schoolId of schoolIds) {
    await ensureSchoolGroups({ schoolId });

    const students = await Student.find({ schoolId }).lean();
    for (const student of students) {
      if (student.groupId) continue;

      const group = await findOrCreateGroupByLegacyFields({
        schoolId,
        yearGroup: student.yearGroup,
        form: student.form,
      });

      if (!group) {
        console.warn(`Skipping student ${student._id}: could not map year/form`);
        continue;
      }

      await Student.updateOne(
        { _id: student._id, schoolId },
        {
          $set: {
            groupId: group._id,
            assignedTeacherId: group.ownerTeacherId || student.assignedTeacherId || null,
            yearGroup: `Year ${group.year}`,
            form: group.form,
          },
        },
      );
    }
  }

  await mongoose.connection.close();
  console.log("Student group migration complete");
};

run().catch(async (error) => {
  console.error("Student group migration failed", error);
  await mongoose.connection.close();
  process.exit(1);
});
