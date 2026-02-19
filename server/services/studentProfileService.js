const mongoose = require("mongoose");

const Student = require("../models/Student");
const Incident = require("../models/Incident");
const Detention = require("../models/Detention");
const Reward = require("../models/Reward");
const DetentionOffset = require("../models/DetentionOffset");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

function toPositiveInt(value, fallback, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseListParams(query, name) {
  return {
    page: toPositiveInt(query[`${name}Page`], 1),
    limit: toPositiveInt(query[`${name}Limit`], 20),
  };
}

async function fetchTimelineList({ model, filter, sort, page, limit }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    model.countDocuments(filter),
  ]);

  return { items, page, limit, total };
}

async function getTenantStudentOrNull({ schoolId, studentId, assignedTeacherId = null }) {
  const filter = { _id: studentId, schoolId };
  if (assignedTeacherId) filter.assignedTeacherId = assignedTeacherId;

  return Student.findOne(
    filter,
    {
      firstName: 1,
      lastName: 1,
      admissionNumber: 1,
      yearGroup: 1,
      form: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  ).lean();
}

async function getStudentProfileData({ schoolId, studentId, role, userId }) {
  const tenantSchoolId = toObjectId(schoolId);
  const tenantStudentId = toObjectId(studentId);

  const student = await getTenantStudentOrNull({
    schoolId: tenantSchoolId,
    studentId: tenantStudentId,
    assignedTeacherId: role === "teacher" ? toObjectId(userId) : null,
  });

  if (!student) return null;

  const [incidentRows, detentionRows, detentionMinutesRows, rewardRows, offsetRows, overdueCount] =
    await Promise.all([
      Incident.aggregate([
        { $match: { schoolId: tenantSchoolId, studentId: tenantStudentId } },
        { $group: { _id: null, incidentsTotal: { $sum: 1 } } },
      ]),
      Detention.aggregate([
        { $match: { schoolId: tenantSchoolId, studentId: tenantStudentId } },
        {
          $group: {
            _id: null,
            detentionsTotal: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
            served: { $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] } },
            voided: { $sum: { $cond: [{ $eq: ["$status", "voided"] }, 1, 0] } },
          },
        },
      ]),
      Detention.aggregate([
        { $match: { schoolId: tenantSchoolId, studentId: tenantStudentId } },
        {
          $group: {
            _id: null,
            minutesAssignedTotal: { $sum: "$minutesAssigned" },
            minutesRemainingTotal: { $sum: "$minutesRemaining" },
          },
        },
      ]),
      Reward.aggregate([
        { $match: { schoolId: tenantSchoolId, studentId: tenantStudentId } },
        {
          $group: {
            _id: null,
            rewardsTotal: { $sum: 1 },
            rewardMinutesAwardedTotal: { $sum: "$minutesAwarded" },
          },
        },
      ]),
      DetentionOffset.aggregate([
        { $match: { schoolId: tenantSchoolId, studentId: tenantStudentId } },
        {
          $group: {
            _id: null,
            offsetMinutesAppliedTotal: { $sum: "$minutesApplied" },
          },
        },
      ]),
      Detention.countDocuments({
        schoolId: tenantSchoolId,
        studentId: tenantStudentId,
        status: "scheduled",
        scheduledFor: { $ne: null, $lt: new Date() },
        minutesRemaining: { $gt: 0 },
      }),
    ]);

  const incidentMetrics = incidentRows[0] || {};
  const detentionMetrics = detentionRows[0] || {};
  const detentionMinutes = detentionMinutesRows[0] || {};
  const rewardMetrics = rewardRows[0] || {};
  const offsetMetrics = offsetRows[0] || {};

  return {
    student: {
      id: String(student._id),
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNumber: student.admissionNumber,
      yearGroup: student.yearGroup,
      form: student.form,
      status: student.status,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    },
    summary: {
      incidentsTotal: incidentMetrics.incidentsTotal || 0,
      detentionsTotal: detentionMetrics.detentionsTotal || 0,
      detentionsByStatus: {
        pending: detentionMetrics.pending || 0,
        scheduled: detentionMetrics.scheduled || 0,
        served: detentionMetrics.served || 0,
        voided: detentionMetrics.voided || 0,
      },
      minutesAssignedTotal: detentionMinutes.minutesAssignedTotal || 0,
      minutesRemainingTotal: detentionMinutes.minutesRemainingTotal || 0,
      rewardsTotal: rewardMetrics.rewardsTotal || 0,
      rewardMinutesAwardedTotal: rewardMetrics.rewardMinutesAwardedTotal || 0,
      offsetMinutesAppliedTotal: offsetMetrics.offsetMinutesAppliedTotal || 0,
    },
    flags: {
      hasPendingDetentions:
        (detentionMetrics.pending || 0) + (detentionMetrics.scheduled || 0) > 0,
      hasOverdueScheduledDetentions: overdueCount > 0,
    },
  };
}

async function getStudentTimelineData({ schoolId, studentId, role, userId, query = {} }) {
  const tenantSchoolId = toObjectId(schoolId);
  const tenantStudentId = toObjectId(studentId);

  const student = await getTenantStudentOrNull({
    schoolId: tenantSchoolId,
    studentId: tenantStudentId,
    assignedTeacherId: role === "teacher" ? toObjectId(userId) : null,
  });

  if (!student) return null;

  const incidentsParams = parseListParams(query, "incidents");
  const detentionsParams = parseListParams(query, "detentions");
  const rewardsParams = parseListParams(query, "rewards");
  const offsetsParams = parseListParams(query, "offsets");

  const filter = { schoolId: tenantSchoolId, studentId: tenantStudentId };

  const [incidents, detentions, rewards, offsets] = await Promise.all([
    fetchTimelineList({
      model: Incident,
      filter,
      sort: { occurredAt: -1, _id: -1 },
      page: incidentsParams.page,
      limit: incidentsParams.limit,
    }),
    fetchTimelineList({
      model: Detention,
      filter,
      sort: { createdAt: -1, _id: -1 },
      page: detentionsParams.page,
      limit: detentionsParams.limit,
    }),
    fetchTimelineList({
      model: Reward,
      filter,
      sort: { awardedAt: -1, _id: -1 },
      page: rewardsParams.page,
      limit: rewardsParams.limit,
    }),
    fetchTimelineList({
      model: DetentionOffset,
      filter,
      sort: { appliedAt: -1, _id: -1 },
      page: offsetsParams.page,
      limit: offsetsParams.limit,
    }),
  ]);

  return { incidents, detentions, rewards, offsets };
}

module.exports = { getStudentProfileData, getStudentTimelineData };
