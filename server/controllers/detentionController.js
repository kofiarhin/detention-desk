const Detention = require("../models/Detention");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");

const VALID_TRANSITIONS = {
  pending: ["scheduled", "served", "voided"],
  scheduled: ["served", "voided"],
  served: [],
  voided: [],
};

exports.listDetentions = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parseListQuery(req.query || {});
    const { studentId, status, from, to } = req.query || {};
    const filter = { schoolId: req.auth.schoolId };
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      Detention.find(filter).sort(sort).skip(skip).limit(limit).lean(),
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
