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

const COMMAND_CENTER_VIEWS = ["upcoming", "today", "needsAttention", "history"];

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

function getOpsFilter({ schoolId, view, now }) {
  const { start, end } = getDayBounds(now);
  const filter = { schoolId };

  if (view === "upcoming") {
    filter.status = "scheduled";
    filter.scheduledFor = { $gt: now };
    return filter;
  }

  if (view === "today") {
    filter.status = "scheduled";
    filter.scheduledFor = { $gte: start, $lte: end };
    return filter;
  }

  if (view === "needsAttention") {
    filter.status = "scheduled";
    filter.scheduledFor = { $lt: now };
    return filter;
  }

  filter.status = { $in: ["served", "voided"] };
  return filter;
}

function normalizeLifecycleFromSchedule(detention, body = {}) {
  if (!Object.prototype.hasOwnProperty.call(body, "scheduledFor")) {
    return;
  }

  const nextScheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
  if (body.scheduledFor && Number.isNaN(nextScheduledFor.getTime())) {
    throw new Error("Invalid scheduledFor date");
  }

  if (nextScheduledFor) {
    detention.scheduledFor = nextScheduledFor;
    detention.status = "scheduled";
  } else {
    detention.scheduledFor = null;
    detention.status = "pending";
  }

  detention.servedAt = null;
  detention.servedBy = null;
  detention.voidedAt = null;
  detention.voidedBy = null;

  if (!Number.isFinite(detention.minutesRemaining) || detention.minutesRemaining < 0) {
    detention.minutesRemaining = detention.minutesAssigned;
  }
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
  const view = req.query?.view || "upcoming";

  if (!COMMAND_CENTER_VIEWS.includes(view)) {
    return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid view"));
  }

  const now = new Date();
  const { start, end } = getDayBounds(now);
  const scopedFilter = applyStudentScope(req);

  const countFilter = { ...scopedFilter };

  try {
    const [items, total, upcomingCount, todayCount, needsAttentionCount, historyCount] = await Promise.all([
      Detention.find(getOpsFilter({ schoolId: scopedFilter.schoolId, view, now }))
        .populate("studentId", "firstName lastName admissionNumber")
        .populate({ path: "incidentId", populate: { path: "categoryId", select: "name" } })
        .populate("createdBy", "name")
        .populate("assignedTeacherId", "name")
        .sort({ scheduledFor: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Detention.countDocuments(getOpsFilter({ schoolId: scopedFilter.schoolId, view, now })),
      Detention.countDocuments({ ...countFilter, status: "scheduled", scheduledFor: { $gt: now } }),
      Detention.countDocuments({ ...countFilter, status: "scheduled", scheduledFor: { $gte: start, $lte: end } }),
      Detention.countDocuments({ ...countFilter, status: "scheduled", scheduledFor: { $lt: now } }),
      Detention.countDocuments({ ...countFilter, status: { $in: ["served", "voided"] } }),
    ]);

    return res.json(
      successResponse({
        items,
        counts: {
          upcoming: upcomingCount,
          today: todayCount,
          needsAttention: needsAttentionCount,
          history: historyCount,
        },
        meta: buildMeta({ page, limit, total }),
      }),
    );
  } catch (err) {
    console.error("[getCommandCenter]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load detention ops"));
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

    if (["served", "voided"].includes(detention.status)) {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Finalized detentions cannot be edited"));
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "minutesAssigned")) {
      const nextMinutesAssigned = Number(req.body.minutesAssigned);
      if (!Number.isFinite(nextMinutesAssigned) || nextMinutesAssigned < 0) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "minutesAssigned must be a non-negative number"));
      }

      detention.minutesAssigned = nextMinutesAssigned;
      if (!Number.isFinite(detention.minutesRemaining) || detention.minutesRemaining > nextMinutesAssigned) {
        detention.minutesRemaining = nextMinutesAssigned;
      }
    }

    try {
      normalizeLifecycleFromSchedule(detention, req.body || {});
    } catch (error) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", error.message));
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
    if (detention.status === "served") {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Detention is already served"));
    }
    if (detention.status === "voided") {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Voided detention cannot be served"));
    }

    if (req.auth.role === "teacher") {
      if (String(detention.createdBy) !== String(req.auth.userId)) {
        return res.status(403).json(errorResponse("FORBIDDEN", "Only assigning teacher can serve this detention"));
      }

      const student = await loadStudentForTeacherOrFail(req, detention.studentId);
      if (!student) return res.status(403).json(errorResponse("FORBIDDEN", "Student not assigned to teacher"));
    }

    detention.status = "served";
    detention.minutesRemaining = 0;
    detention.servedAt = new Date();
    detention.servedBy = req.auth.userId;
    detention.voidedAt = null;
    detention.voidedBy = null;
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
    if (detention.status === "served") {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Served detention cannot be voided"));
    }
    if (detention.status === "voided") {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Detention is already voided"));
    }

    detention.status = "voided";
    detention.voidedAt = new Date();
    detention.voidedBy = req.auth.userId;
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
