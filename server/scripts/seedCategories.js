/* eslint-disable no-console */
require("dotenv").config();

const mongoose = require("mongoose");

const { connectDB } = require("../config/db");
const School = require("../models/School");
const { seedDefaultCategories } = require("../services/seedService");

const run = async () => {
  await connectDB();

  const schools = await School.find({}, { _id: 1, name: 1 }).lean();

  if (!schools.length) {
    console.log("[seed:categories] No schools found. Nothing to seed.");
    return;
  }

  for (const school of schools) {
    await seedDefaultCategories({ schoolId: school._id });
    console.log(
      `[seed:categories] ensured default categories for school ${school.name} (${school._id})`,
    );
  }

  console.log(`[seed:categories] completed for ${schools.length} school(s).`);
};

run()
  .catch((error) => {
    console.error("[seed:categories] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
