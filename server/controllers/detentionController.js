const mongoose = require("mongoose");

const Detention = require("../models/Detention");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");
const {
  bulkServeDetentions,
  bulkVoidDetentions,
  bulkScheduleDetentions,
} = require("../services/detentionOperationsService");
const { loadStudentForTeacherOrFail, applyStudentScope } = require("../services/studentAccessService");

const VALID_TRANSITIONS = {
  pending: ["scheduled", "served", "voided"],
  scheduled: ["served", "voided"],
  served: [],
  voided: [],
};

const COMMAND_CENTER_VIEWS = ["needsAttention", "today", "upcoming", "unscheduled", "history"];
const VALID_STATUSES = ["pending", "scheduled", "served", "voided"];

function toBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function validateDetentionIds(detentionIds) {
  if (!Array.isArray(detentionIds)) {
    return "detentionIds must be an array";
  }

  for (const id of detentionIds) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return "detentionIds contains invalid id";
    }
  }

  return null;
}

function getDayBounds(now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(-1);

  return { start, end };
}

function getViewMatch(view, now) {
  const { start, end } = getDayBounds(now);

  if (view === "needsAttention") {
    return {
      $or: [
        { status: "pending", scheduledFor: null },
        { status: "scheduled", scheduledFor: { $lt: now } },
      ],
    };
  }

  if (view === "today") {
    return {
      status: { $in: ["scheduled", "pending"] },
      scheduledFor: { $gte: start, $lte: end },
    };
  }

  if (view === "upcoming") {
    return {
      status: "scheduled",
      scheduledFor: { $gt: end },
    };
  }

  if (view === "unscheduled") {
    return {
      status: "pending",
      scheduledFor: null,
    };
  }

  return {
    status: { $in: ["served", "voided"] },
  };
}

function getSortStages(view, now) {
  if (view === "needsAttention") {
    return [
      {
        $addFields: {
          _overdueRank: {
            $cond: [{ $and: [{ $eq: ["$status", "scheduled"] }, { $lt: ["$scheduledFor", now] }] }, 0, 1],
          },
          _scheduledSort: {
            $ifNull: ["$scheduledFor", new Date("9999-12-31T23:59:59.999Z")],
          },
        },
      },
      { $sort: { _overdueRank: 1, _scheduledSort: 1, createdAt: -1 } },
      { $project: { _overdueRank: 0, _scheduledSort: 0 } },
    ];
  }

  if (view === "today" || view === "upcoming") {
    return [{ $sort: { scheduledFor: 1, createdAt: -1 } }];
  }

  if (view === "unscheduled") {
    return [{ $sort: { createdAt: -1 } }];
  }

  return [{ $sort: { servedAt: -1, createdAt: -1 } }];
}

exports.listDetentions = async (req, res) => {
  try {
    const { page, limit, skip } = parseListQuery(req.query || {});
    const { studentId, status, fromDate, toDate, hasRemainingMinutes } = req.query || {};

    if (studentId && !mongoose.Types.ObjectId.isValid(String(studentId))) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid studentId"));
    }

    if (status && !["pending", "scheduled", "served", "voided"].includes(status)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid status"));
    }

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    if (fromDate && Number.isNaN(from.getTime())) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid fromDate"));
    }

    if (toDate && Number.isNaN(to.getTime())) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid toDate"));
    }

    const hasRemaining =
      Object.prototype.hasOwnProperty.call(req.query || {}, "hasRemainingMinutes")
        ? toBoolean(hasRemainingMinutes)
        : null;

    if (
      Object.prototype.hasOwnProperty.call(req.query || {}, "hasRemainingMinutes") &&
      hasRemaining === null
    ) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "hasRemainingMinutes must be true or false"));
    }

    const filter = applyStudentScope(req);
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    if (hasRemaining === true) {
      filter.minutesRemaining = { $gt: 0 };
    } else if (hasRemaining === false) {
      filter.minutesRemaining = 0;
    }

    const [items, total] = await Promise.all([
      Detention.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Detention.countDocuments(filter),
    ]);

    return res.json(successResponse(items, buildMeta({ page, limit, total })));
  } catch (err) {
    console.error("[listDetentions]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load detentions"));
  }
};

exports.getCommandCenter = async (req, res) => {
  const { page, limit, skip } = parseListQuery(req.query || {});
  const view = req.query?.view || "needsAttention";
  const q = String(req.query?.q || "").trim();
  const { groupId } = req.query || {};
  const status = req.query?.status ? String(req.query.status).trim() : "";

  if (!COMMAND_CENTER_VIEWS.includes(view)) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid view"));
  }

  if (groupId && !mongoose.Types.ObjectId.isValid(String(groupId))) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid groupId"));
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid status"));
  }

  const now = new Date();
  const scopedMatch = applyStudentScope(req);

  const baseJoinPipeline = [
    { $match: scopedMatch },
    {
      $lookup: {
        from: "students",
        localField: "studentId",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    {
      $lookup: {
        from: "groups",
        localField: "student.groupId",
        foreignField: "_id",
        as: "group",
      },
    },
    {
      $unwind: {
        path: "$group",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const searchFilter = [];

  if (q) {
    const regex = new RegExp(q, "i");
    searchFilter.push({
      $or: [
        { "student.firstName": regex },
        { "student.lastName": regex },
        { "student.admissionNumber": regex },
      ],
    });
  }

  if (groupId) {
    searchFilter.push({ "student.groupId": new mongoose.Types.ObjectId(groupId) });
  }

  if (status) {
    searchFilter.push({ status });
  }

  const queryMatch = {
    $and: [getViewMatch(view, now), ...searchFilter],
  };

  try {
    const countsPipeline = [
      { $match: scopedMatch },
      {
        $group: {
          _id: null,
          needsAttention: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $and: [{ $eq: ["$status", "pending"] }, { $eq: ["$scheduledFor", null] }] },
                    { $and: [{ $eq: ["$status", "scheduled"] }, { $lt: ["$scheduledFor", now] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          today: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["scheduled", "pending"]] },
                    { $ne: ["$scheduledFor", null] },
                    { $gte: ["$scheduledFor", getDayBounds(now).start] },
                    { $lte: ["$scheduledFor", getDayBounds(now).end] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          upcoming: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "scheduled"] },
                    { $gt: ["$scheduledFor", getDayBounds(now).end] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          unscheduled: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ["$status", "pending"] }, { $eq: ["$scheduledFor", null] }],
                },
                1,
                0,
              ],
            },
          },
          history: {
            $sum: {
              $cond: [{ $in: ["$status", ["served", "voided"]] }, 1, 0],
            },
          },
        },
      },
    ];

    const [countRows, listRows] = await Promise.all([
      Detention.aggregate(countsPipeline),
      Detention.aggregate([
        ...baseJoinPipeline,
        { $match: queryMatch },
        ...getSortStages(view, now),
        {
          $facet: {
            items: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  _id: 1,
                  studentId: 1,
                  assignedTeacherId: 1,
                  minutesAssigned: 1,
                  minutesRemaining: 1,
                  status: 1,
                  scheduledFor: 1,
                  servedAt: 1,
                  servedBy: 1,
                  createdBy: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  student: {
                    _id: "$student._id",
                    firstName: "$student.firstName",
                    lastName: "$student.lastName",
                    admissionNumber: "$student.admissionNumber",
                    groupId: "$student.groupId",
                  },
                  group: {
                    _id: "$group._id",
                    label: "$group.label",
                    year: "$group.year",
                    form: "$group.form",
                  },
                },
              },
            ],
            meta: [{ $count: "total" }],
          },
        },
      ]),
    ]);

    const counts = countRows[0] || {
      needsAttention: 0,
      today: 0,
      upcoming: 0,
      unscheduled: 0,
      history: 0,
    };

    const items = listRows[0]?.items || [];
    const total = listRows[0]?.meta?.[0]?.total || 0;

    return res.json(successResponse({ items, counts, meta: buildMeta({ page, limit, total }) }));
  } catch (err) {
    console.error("[getCommandCenter]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load detention command center"));
  }
};

exports.getDetention = async (req, res) => {
  try {
    const item = await Detention.findOne(applyStudentScope(req, { _id: req.params.id })).lean();
    if (!item) return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));
    return res.json(successResponse(item));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));
  }
};

exports.updateDetention = async (req, res) => {
  try {
    const detention = await Detention.findOne(applyStudentScope(req, { _id: req.params.id }));
    if (!detention) return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));

    const nextStatus = req.body?.status;
    const scheduledFor = req.body?.scheduledFor;

    if (nextStatus && !VALID_TRANSITIONS[detention.status].includes(nextStatus)) {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Invalid status transition"));
    }

    if (nextStatus) detention.status = nextStatus;
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "scheduledFor")) {
      detention.scheduledFor = scheduledFor || null;
    }

    await detention.save();
    return res.json(successResponse(detention));
  } catch (err) {
    console.error("[updateDetention]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update detention"));
  }
};

exports.serveDetention = async (req, res) => {
  try {
    const detention = await Detention.findOne(applyStudentScope(req, { _id: req.params.id }));
    if (!detention) return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));
    if (req.auth.role === "teacher") {
      const student = await loadStudentForTeacherOrFail(req, detention.studentId);
      if (!student) return res.status(403).json(errorResponse("FORBIDDEN", "Student not assigned to teacher"));
    }

    if (!["pending", "scheduled"].includes(detention.status)) {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Detention cannot be served"));
    }

    detention.status = "served";
    detention.minutesRemaining = 0;
    detention.servedAt = new Date();
    detention.servedBy = req.auth.userId;
    await detention.save();
    return res.json(successResponse(detention));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not serve detention"));
  }
};

exports.voidDetention = async (req, res) => {
  try {
    const detention = await Detention.findOne(applyStudentScope(req, { _id: req.params.id }));
    if (!detention) return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));
    if (!["pending", "scheduled"].includes(detention.status)) {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Detention cannot be voided"));
    }

    detention.status = "voided";
    await detention.save();
    return res.json(successResponse(detention));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not void detention"));
  }
};

exports.bulkServeDetentions = async (req, res) => {
  const { detentionIds } = req.body || {};
  const validationError = validateDetentionIds(detentionIds);

  if (validationError) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", validationError));
  }

  try {
    const summary = await bulkServeDetentions({ schoolId: req.auth.schoolId, detentionIds });
    return res.json(successResponse(summary));
  } catch (err) {
    console.error("[bulkServeDetentions]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not bulk serve detentions"));
  }
};

exports.bulkVoidDetentions = async (req, res) => {
  const { detentionIds } = req.body || {};
  const validationError = validateDetentionIds(detentionIds);

  if (validationError) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", validationError));
  }

  try {
    const summary = await bulkVoidDetentions({ schoolId: req.auth.schoolId, detentionIds });
    return res.json(successResponse(summary));
  } catch (err) {
    console.error("[bulkVoidDetentions]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not bulk void detentions"));
  }
};

exports.bulkScheduleDetentions = async (req, res) => {
  const { detentionIds, scheduledFor } = req.body || {};
  const validationError = validateDetentionIds(detentionIds);

  if (validationError) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", validationError));
  }

  if (!scheduledFor) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "scheduledFor is required"));
  }

  const scheduleDate = new Date(scheduledFor);
  if (Number.isNaN(scheduleDate.getTime())) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "scheduledFor must be a valid ISO date"));
  }

  if (scheduleDate.getTime() <= Date.now()) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "scheduledFor must be in the future"));
  }

  try {
    const summary = await bulkScheduleDetentions({
      schoolId: req.auth.schoolId,
      detentionIds,
      scheduledFor: scheduleDate,
    });
    return res.json(successResponse(summary));
  } catch (err) {
    console.error("[bulkScheduleDetentions]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not bulk schedule detentions"));
  }
};
