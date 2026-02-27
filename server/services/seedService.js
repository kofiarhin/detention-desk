const Category = require("../models/Category");
const { normalizeCategoryName } = require("../utils/normalize");

const DEFAULT_BEHAVIOUR = [
  { name: "Disruption", sortOrder: 10, detentionMinutes: 20 },
  { name: "Late to Class", sortOrder: 20, detentionMinutes: 15 },
  { name: "Uniform Issue", sortOrder: 30, detentionMinutes: 10 },
  { name: "Disrespect", sortOrder: 40, detentionMinutes: 30 },
];

const DEFAULT_REWARD = [
  { name: "Good Work", sortOrder: 10, rewardMinutes: 10 },
  { name: "Helping Others", sortOrder: 20, rewardMinutes: 15 },
  { name: "Improvement", sortOrder: 30, rewardMinutes: 10 },
];

async function seedDefaultCategories({ schoolId }) {
  const ops = [];

  for (const c of DEFAULT_BEHAVIOUR) {
    ops.push({
      updateOne: {
        filter: {
          schoolId,
          type: "behaviour",
          nameNormalized: normalizeCategoryName(c.name),
        },
        update: {
          $setOnInsert: {
            schoolId,
            type: "behaviour",
            name: c.name,
            sortOrder: c.sortOrder,
            detentionMinutes: c.detentionMinutes,
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
          nameNormalized: normalizeCategoryName(c.name),
        },
        update: {
          $setOnInsert: {
            schoolId,
            type: "reward",
            name: c.name,
            sortOrder: c.sortOrder,
            rewardMinutes: c.rewardMinutes,
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
