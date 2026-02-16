const SchoolPolicy = require("../models/SchoolPolicy");
const { successResponse, errorResponse } = require("../utils/response");

exports.getPolicy = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;

    const policy = await SchoolPolicy.findOne({ schoolId }).lean();
    if (!policy)
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", "Policy not found"));

    return res.json(successResponse(policy));
  } catch (err) {
    console.error("[getPolicy] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load policy"));
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;

    const allowed = [
      "defaultDetentionMinutes",
      "rewardOffsetMinutes",
      "teacherPermissions",
    ];
    const patch = {};

    for (const key of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        patch[key] = req.body[key];
      }
    }

    const updated = await SchoolPolicy.findOneAndUpdate(
      { schoolId },
      { $set: patch },
      { new: true },
    ).lean();

    if (!updated)
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", "Policy not found"));

    return res.json(successResponse(updated));
  } catch (err) {
    console.error("[updatePolicy] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not update policy"));
  }
};
