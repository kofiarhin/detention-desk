const mongoose = require("mongoose");

const Incident = require("../models/Incident");
const Detention = require("../models/Detention");
const Reward = require("../models/Reward");
const DetentionOffset = require("../models/DetentionOffset");

const { buildMeta } = require("./queryService");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function daysAgo(now, days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function getRecentList({ model, schoolId, sort, page, limit }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    model
      .find({ schoolId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    model.countDocuments({ schoolId }),
  ]);

  return {
    items,
    meta: buildMeta({ page, limit, total }),
  };
}

async function getAdminDashboardData({ schoolId, query = {} }) {
  const tenantSchoolId = toObjectId(schoolId);
  const now = new Date();
  const since7d = daysAgo(now, 7);
  const since30d = daysAgo(now, 30);

  const topLimit = Math.min(toPositiveInt(query.topLimit, 5), 20);
  const recentPage = toPositiveInt(query.recentPage, 1);
  const recentLimit = Math.min(toPositiveInt(query.recentLimit, 10), 50);

  const [
    incidentMetricsRows,
    detentionMetricsRows,
    detentionMinutesRows,
    rewardMetricsRows,
    offsetMetricsRows,
    studentsWithHighestPendingMinutes,
    mostFrequentBehaviourCategories,
    recentIncidents,
    recentDetentions,
    recentRewards,
  ] = await Promise.all([
    Incident.aggregate([
      { $match: { schoolId: tenantSchoolId } },
      {
        $group: {
          _id: null,
          totalIncidents7d: {
            $sum: {
              $cond: [{ $gte: ["$occurredAt", since7d] }, 1, 0],
            },
          },
          totalIncidents30d: {
            $sum: {
              $cond: [{ $gte: ["$occurredAt", since30d] }, 1, 0],
            },
          },
        },
      },
    ]),
    Detention.aggregate([
      { $match: { schoolId: tenantSchoolId } },
      {
        $group: {
          _id: null,
          totalDetentions7d: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", since7d] }, 1, 0],
            },
          },
          totalDetentions30d: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", since30d] }, 1, 0],
            },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          scheduled: {
            $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] },
          },
          served: {
            $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] },
          },
          voided: {
            $sum: { $cond: [{ $eq: ["$status", "voided"] }, 1, 0] },
          },
        },
      },
    ]),
    Detention.aggregate([
      { $match: { schoolId: tenantSchoolId } },
      {
        $group: {
          _id: null,
          minutesAssignedTotal: { $sum: "$minutesAssigned" },
          minutesRemainingTotal: { $sum: "$minutesRemaining" },
        },
      },
    ]),
    Reward.aggregate([
      { $match: { schoolId: tenantSchoolId } },
      {
        $group: {
          _id: null,
          rewardMinutesAwarded7d: {
            $sum: {
              $cond: [{ $gte: ["$awardedAt", since7d] }, "$minutesAwarded", 0],
            },
          },
          rewardMinutesAwarded30d: {
            $sum: {
              $cond: [{ $gte: ["$awardedAt", since30d] }, "$minutesAwarded", 0],
            },
          },
        },
      },
    ]),
    DetentionOffset.aggregate([
      { $match: { schoolId: tenantSchoolId } },
      {
        $group: {
          _id: null,
          offsetMinutesApplied7d: {
            $sum: {
              $cond: [{ $gte: ["$appliedAt", since7d] }, "$minutesApplied", 0],
            },
          },
          offsetMinutesApplied30d: {
            $sum: {
              $cond: [{ $gte: ["$appliedAt", since30d] }, "$minutesApplied", 0],
            },
          },
        },
      },
    ]),
    Detention.aggregate([
      {
        $match: {
          schoolId: tenantSchoolId,
          status: { $in: ["pending", "scheduled"] },
          minutesRemaining: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$studentId",
          pendingMinutes: { $sum: "$minutesRemaining" },
        },
      },
      { $sort: { pendingMinutes: -1, _id: 1 } },
      { $limit: topLimit },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $project: {
          _id: 0,
          studentId: "$_id",
          pendingMinutes: 1,
          student: {
            $let: {
              vars: { s: { $arrayElemAt: ["$student", 0] } },
              in: {
                firstName: "$$s.firstName",
                lastName: "$$s.lastName",
                admissionNumber: "$$s.admissionNumber",
                yearGroup: "$$s.yearGroup",
                form: "$$s.form",
              },
            },
          },
        },
      },
    ]),
    Incident.aggregate([
      { $match: { schoolId: tenantSchoolId } },
      {
        $group: {
          _id: "$categoryId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: topLimit },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          count: 1,
          categoryName: { $ifNull: [{ $arrayElemAt: ["$category.name", 0] }, null] },
        },
      },
    ]),
    getRecentList({
      model: Incident,
      schoolId: tenantSchoolId,
      sort: { occurredAt: -1, _id: -1 },
      page: recentPage,
      limit: recentLimit,
    }),
    getRecentList({
      model: Detention,
      schoolId: tenantSchoolId,
      sort: { createdAt: -1, _id: -1 },
      page: recentPage,
      limit: recentLimit,
    }),
    getRecentList({
      model: Reward,
      schoolId: tenantSchoolId,
      sort: { awardedAt: -1, _id: -1 },
      page: recentPage,
      limit: recentLimit,
    }),
  ]);

  const incidentMetrics = incidentMetricsRows[0] || {};
  const detentionMetrics = detentionMetricsRows[0] || {};
  const detentionMinutes = detentionMinutesRows[0] || {};
  const rewardMetrics = rewardMetricsRows[0] || {};
  const offsetMetrics = offsetMetricsRows[0] || {};

  return {
    metrics: {
      totalIncidents7d: incidentMetrics.totalIncidents7d || 0,
      totalIncidents30d: incidentMetrics.totalIncidents30d || 0,
      totalDetentions7d: detentionMetrics.totalDetentions7d || 0,
      totalDetentions30d: detentionMetrics.totalDetentions30d || 0,
      detentionsByStatus: {
        pending: detentionMetrics.pending || 0,
        scheduled: detentionMetrics.scheduled || 0,
        served: detentionMetrics.served || 0,
        voided: detentionMetrics.voided || 0,
      },
      minutesAssignedTotal: detentionMinutes.minutesAssignedTotal || 0,
      minutesRemainingTotal: detentionMinutes.minutesRemainingTotal || 0,
      rewardMinutesAwarded7d: rewardMetrics.rewardMinutesAwarded7d || 0,
      rewardMinutesAwarded30d: rewardMetrics.rewardMinutesAwarded30d || 0,
      offsetMinutesApplied7d: offsetMetrics.offsetMinutesApplied7d || 0,
      offsetMinutesApplied30d: offsetMetrics.offsetMinutesApplied30d || 0,
    },
    widgets: {
      studentsWithHighestPendingMinutes,
      mostFrequentBehaviourCategories,
      recentIncidents,
      recentDetentions,
      recentRewards,
    },
  };
}

module.exports = { getAdminDashboardData };
