const Reward = require("../models/Reward");
const Category = require("../models/Category");
const DetentionOffset = require("../models/DetentionOffset");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");
const { getRewardMinutes, createRewardAndApplyOffsets } = require("../services/rewardService");
const {
  loadStudentForRole,
  loadStudentForTeacherOrFail,
  applyStudentScope,
} = require("../services/studentAccessService");

exports.createReward = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { studentId, categoryId, notes, awardedAt } = req.body || {};

    if (!studentId) return res.status(400).json(errorResponse("VALIDATION_ERROR", "studentId is required"));
    if (!categoryId) return res.status(400).json(errorResponse("VALIDATION_ERROR", "categoryId is required"));

    const student = req.auth.role === "teacher"
      ? await loadStudentForTeacherOrFail(req, studentId)
      : await loadStudentForRole(req, studentId);
    if (!student) {
      return res.status(req.auth.role === "teacher" ? 403 : 400).json(errorResponse(req.auth.role === "teacher" ? "FORBIDDEN" : "VALIDATION_ERROR", req.auth.role === "teacher" ? "Student not assigned to teacher" : "Invalid studentId"));
    }

    const category = await Category.findOne({ _id: categoryId, schoolId, type: "reward" }).lean();
    if (!category) return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid reward categoryId"));

    const minutesAwarded = await getRewardMinutes({ schoolId, categoryId });
    if (!minutesAwarded) return res.status(400).json(errorResponse("VALIDATION_ERROR", "Could not resolve reward minutes"));

    const result = await createRewardAndApplyOffsets({
      schoolId,
      studentId,
      assignedTeacherId: student.assignedTeacherId,
      categoryId,
      notes: notes || "",
      awardedBy: req.auth.userId,
      awardedAt: awardedAt ? new Date(awardedAt) : new Date(),
      minutesAwarded,
    });

    return res.status(201).json(successResponse({ reward: result.reward, offsetsApplied: result.offsets.length }));
  } catch (err) {
    console.error("[createReward]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not create reward"));
  }
};

exports.listRewards = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parseListQuery(req.query || {});
    const { studentId, from, to } = req.query || {};
    const filter = applyStudentScope(req);
    if (studentId) filter.studentId = studentId;
    if (from || to) {
      filter.awardedAt = {};
      if (from) filter.awardedAt.$gte = new Date(from);
      if (to) filter.awardedAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      Reward.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Reward.countDocuments(filter),
    ]);

    return res.json(successResponse(items, buildMeta({ page, limit, total })));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load rewards"));
  }
};

exports.getReward = async (req, res) => {
  try {
    const filter = applyStudentScope(req, { _id: req.params.id });
    const reward = await Reward.findOne(filter).lean();
    if (!reward) return res.status(404).json(errorResponse("NOT_FOUND", "Reward not found"));
    return res.json(successResponse(reward));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Reward not found"));
  }
};

exports.listOffsets = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parseListQuery(req.query || {});
    const { studentId, detentionId, rewardId } = req.query || {};
    const filter = { schoolId: req.auth.schoolId };
    if (studentId) filter.studentId = studentId;
    if (detentionId) filter.detentionId = detentionId;
    if (rewardId) filter.rewardId = rewardId;

    const [items, total] = await Promise.all([
      DetentionOffset.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      DetentionOffset.countDocuments(filter),
    ]);

    return res.json(successResponse(items, buildMeta({ page, limit, total })));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load offsets"));
  }
};
