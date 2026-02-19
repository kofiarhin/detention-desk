const { getStudentProfileData, getStudentTimelineData } = require("../services/studentProfileService");
const { successResponse, errorResponse } = require("../utils/response");

exports.getStudentProfile = async (req, res) => {
  try {
    const schoolId = req.auth?.schoolId;
    const { id } = req.params || {};

    if (!id) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "student id is required"));
    }

    const data = await getStudentProfileData({
      schoolId,
      studentId: id,
      role: req.auth?.role,
      userId: req.auth?.userId,
    });

    if (!data) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));

    return res.json(successResponse(data));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
  }
};

exports.getStudentTimeline = async (req, res) => {
  try {
    const schoolId = req.auth?.schoolId;
    const { id } = req.params || {};

    if (!id) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "student id is required"));
    }

    const data = await getStudentTimelineData({
      schoolId,
      studentId: id,
      role: req.auth?.role,
      userId: req.auth?.userId,
      query: req.query || {},
    });

    if (!data) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));

    return res.json(successResponse(data));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
  }
};
