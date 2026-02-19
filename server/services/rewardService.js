const Category = require("../models/Category");
const SchoolPolicy = require("../models/SchoolPolicy");
const Detention = require("../models/Detention");
const Reward = require("../models/Reward");
const DetentionOffset = require("../models/DetentionOffset");

async function getRewardMinutes({ schoolId, categoryId }) {
  const [policy, category] = await Promise.all([
    SchoolPolicy.findOne({ schoolId }).lean(),
    Category.findOne({ _id: categoryId, schoolId, type: "reward" }).lean(),
  ]);

  if (!policy || !category) return null;
  if (Number.isFinite(category.rewardMinutes) && category.rewardMinutes > 0) {
    return category.rewardMinutes;
  }
  return policy.rewardOffsetMinutes;
}

async function createRewardAndApplyOffsets({ schoolId, studentId, assignedTeacherId, categoryId, notes, awardedBy, awardedAt, minutesAwarded }) {
  const reward = await Reward.create({
    schoolId,
    studentId,
    categoryId,
    assignedTeacherId,
    notes,
    awardedBy,
    awardedAt,
    minutesAwarded,
  });

  const pendingDetentions = await Detention.find({
    schoolId,
    studentId,
    status: "pending",
    minutesRemaining: { $gt: 0 },
  })
    .sort({ createdAt: 1, _id: 1 })
    .exec();

  let remainingReward = minutesAwarded;
  const offsets = [];

  for (const detention of pendingDetentions) {
    if (remainingReward <= 0) break;

    const minutesApplied = Math.min(remainingReward, detention.minutesRemaining);
    detention.minutesRemaining = Math.max(0, detention.minutesRemaining - minutesApplied);

    if (detention.minutesRemaining === 0) {
      detention.status = "served";
      detention.servedAt = awardedAt;
      detention.servedBy = awardedBy;
    }

    await detention.save();

    const offset = await DetentionOffset.create({
      schoolId,
      rewardId: reward._id,
      detentionId: detention._id,
      studentId,
      minutesApplied,
      appliedAt: awardedAt,
      appliedBy: awardedBy,
    });

    offsets.push(offset);
    remainingReward -= minutesApplied;
  }

  return { reward, offsets };
}

module.exports = { getRewardMinutes, createRewardAndApplyOffsets };
