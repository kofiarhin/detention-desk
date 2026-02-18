const mongoose = require("mongoose");

const Detention = require("../models/Detention");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");
const {
  bulkServeDetentions,
  bulkVoidDetentions,
  bulkScheduleDetentions,
} = require("../services/detentionOperationsService");

const VALID_TRANSITIONS = {
  pending: ["scheduled", "served", "voided"],
  scheduled: ["served", "voided"],
  served: [],
  voided: [],
};

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

    const filter = { schoolId: req.auth.schoolId };
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

exports.getDetention = async (req, res) => {
  try {
    const item = await Detention.findOne({ _id: req.params.id, schoolId: req.auth.schoolId }).lean();
    if (!item) return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));
    return res.json(successResponse(item));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));
  }
};

exports.updateDetention = async (req, res) => {
  try {
    const detention = await Detention.findOne({ _id: req.params.id, schoolId: req.auth.schoolId });
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
    const detention = await Detention.findOne({ _id: req.params.id, schoolId: req.auth.schoolId });
    if (!detention) return res.status(404).json(errorResponse("NOT_FOUND", "Detention not found"));
    if (!["pending", "scheduled"].includes(detention.status)) {
      return res.status(400).json(errorResponse("INVALID_TRANSITION", "Detention cannot be served"));
    }

    detention.status = "served";
    detention.minutesRemaining = 0;
    await detention.save();
    return res.json(successResponse(detention));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not serve detention"));
  }
};

exports.voidDetention = async (req, res) => {
  try {
    const detention = await Detention.findOne({ _id: req.params.id, schoolId: req.auth.schoolId });
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
