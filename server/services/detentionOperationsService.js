const Detention = require("../models/Detention");

async function applyBulkTransition({ schoolId, detentionIds, fromStatuses, setFields }) {
  const requestedIds = Array.from(new Set((detentionIds || []).map((id) => String(id))));
  const totalRequested = requestedIds.length;

  if (totalRequested === 0) {
    return { totalRequested, updatedCount: 0, skippedCount: 0 };
  }

  const filter = {
    schoolId,
    _id: { $in: requestedIds },
  };

  const eligibleFilter = {
    ...filter,
    status: { $in: fromStatuses },
  };

  const result = await Detention.updateMany(eligibleFilter, {
    $set: setFields,
  });

  const updatedCount = Number(result.modifiedCount || 0);

  return {
    totalRequested,
    updatedCount,
    skippedCount: Math.max(0, totalRequested - updatedCount),
  };
}

async function bulkServeDetentions({ schoolId, detentionIds }) {
  return applyBulkTransition({
    schoolId,
    detentionIds,
    fromStatuses: ["pending", "scheduled"],
    setFields: {
      status: "served",
      minutesRemaining: 0,
      servedAt: new Date(),
      voidedAt: null,
      voidedBy: null,
    },
  });
}

async function bulkVoidDetentions({ schoolId, detentionIds }) {
  return applyBulkTransition({
    schoolId,
    detentionIds,
    fromStatuses: ["pending", "scheduled"],
    setFields: {
      status: "voided",
      voidedAt: new Date(),
    },
  });
}

async function bulkScheduleDetentions({ schoolId, detentionIds, scheduledFor }) {
  return applyBulkTransition({
    schoolId,
    detentionIds,
    fromStatuses: ["pending"],
    setFields: {
      status: "scheduled",
      scheduledFor,
      servedAt: null,
      servedBy: null,
      voidedAt: null,
      voidedBy: null,
    },
  });
}

module.exports = {
  bulkServeDetentions,
  bulkVoidDetentions,
  bulkScheduleDetentions,
};
