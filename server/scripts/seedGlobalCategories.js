// server/scripts/seedGlobalCategories.js
// Run: node server/scripts/seedGlobalCategories.js
require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("../models/Category");
const { normalizeCategoryName } = require("../utils/normalize");

const DEFAULTS = [
  // =======================
  // Behaviour (Detentions)
  // =======================
  {
    type: "behaviour",
    name: "Late to class",
    sortOrder: 10,
    detentionMinutes: 10,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Late to school",
    sortOrder: 20,
    detentionMinutes: 20,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Uniform breach",
    sortOrder: 30,
    detentionMinutes: 10,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Missing equipment",
    sortOrder: 40,
    detentionMinutes: 10,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Homework not done",
    sortOrder: 50,
    detentionMinutes: 20,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Disruption in class",
    sortOrder: 60,
    detentionMinutes: 30,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Not following instructions",
    sortOrder: 70,
    detentionMinutes: 20,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Rudeness / disrespect",
    sortOrder: 80,
    detentionMinutes: 45,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Bullying",
    sortOrder: 90,
    detentionMinutes: 60,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Fighting / aggression",
    sortOrder: 100,
    detentionMinutes: 60,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Inappropriate language",
    sortOrder: 110,
    detentionMinutes: 30,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Phone use in lesson",
    sortOrder: 120,
    detentionMinutes: 20,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Out of bounds",
    sortOrder: 130,
    detentionMinutes: 20,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Truancy (missed lesson)",
    sortOrder: 140,
    detentionMinutes: 60,
    rewardMinutes: null,
    isActive: true,
  },
  {
    type: "behaviour",
    name: "Damage to property",
    sortOrder: 150,
    detentionMinutes: 60,
    rewardMinutes: null,
    isActive: true,
  },

  // =======================
  // Reward
  // =======================
  {
    type: "reward",
    name: "Excellent effort",
    sortOrder: 10,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Outstanding work",
    sortOrder: 20,
    detentionMinutes: null,
    rewardMinutes: 15,
    isActive: true,
  },
  {
    type: "reward",
    name: "Helping others",
    sortOrder: 30,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Consistent homework",
    sortOrder: 40,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Positive attitude",
    sortOrder: 50,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Leadership",
    sortOrder: 60,
    detentionMinutes: null,
    rewardMinutes: 15,
    isActive: true,
  },
  {
    type: "reward",
    name: "Good behaviour",
    sortOrder: 70,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Attendance improvement",
    sortOrder: 80,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Punctuality improvement",
    sortOrder: 90,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Contribution to school community",
    sortOrder: 100,
    detentionMinutes: null,
    rewardMinutes: 15,
    isActive: true,
  },
  {
    type: "reward",
    name: "Excellent participation",
    sortOrder: 110,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
  {
    type: "reward",
    name: "Showing resilience",
    sortOrder: 120,
    detentionMinutes: null,
    rewardMinutes: 10,
    isActive: true,
  },
];

function getMongoUri() {
  return (
    process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL
  );
}

(async () => {
  const uri = getMongoUri();
  if (!uri) {
    console.error("❌ Missing Mongo connection string. Set MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const existingCount = await Category.countDocuments();
  if (existingCount > 0) {
    console.log(
      `ℹ️ Categories already exist (${existingCount}). Skipping seed.`,
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  const docs = DEFAULTS.map((c) => ({
    ...c,
    name: String(c.name).trim(),
    nameNormalized: normalizeCategoryName(c.name),
  }));

  await Category.insertMany(docs, { ordered: true });
  console.log(`✅ Seeded ${docs.length} global categories`);

  await mongoose.disconnect();
  console.log("✅ Done");
  process.exit(0);
})().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
