const Category = require("../models/Category");

const DEFAULT_BEHAVIOUR = [
  { name: "Disruption", sortOrder: 10 },
  { name: "Late to Class", sortOrder: 20 },
  { name: "Uniform Issue", sortOrder: 30 },
  { name: "Disrespect", sortOrder: 40 },
];

const DEFAULT_REWARD = [
  { name: "Good Work", sortOrder: 10 },
  { name: "Helping Others", sortOrder: 20 },
  { name: "Improvement", sortOrder: 30 },
];

async function seedDefaultCategories({ schoolId }) {
  const ops = [];

  for (const c of DEFAULT_BEHAVIOUR) {
    ops.push({
      updateOne: {
        filter: {
          schoolId,
          type: "behaviour",
          nameNormalized: c.name.toLowerCase(),
        },
        update: {
          $setOnInsert: {
            schoolId,
            type: "behaviour",
            name: c.name,
            sortOrder: c.sortOrder,
            isActive: true,
          },
        },
        upsert: true,
      },
    });
  }

  for (const c of DEFAULT_REWARD) {
    ops.push({
      updateOne: {
        filter: {
          schoolId,
          type: "reward",
          nameNormalized: c.name.toLowerCase(),
        },
        update: {
          $setOnInsert: {
            schoolId,
            type: "reward",
            name: c.name,
            sortOrder: c.sortOrder,
            isActive: true,
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) await Category.bulkWrite(ops, { ordered: false });
}

module.exports = { seedDefaultCategories };
