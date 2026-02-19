const Detention = require("../models/Detention");
const Incident = require("../models/Incident");
const Note = require("../models/Note");
const ParentStudentLink = require("../models/ParentStudentLink");
const Reward = require("../models/Reward");
const Student = require("../models/Student");

const { successResponse, errorResponse } = require("../utils/response");

const STUDENT_SAFE_FIELDS = "_id firstName lastName admissionNumber yearGroup form status";

const ensureActiveLink = async ({ schoolId, parentId, studentId }) => {
  return ParentStudentLink.findOne({
    schoolId,
    parentId,
    studentId,
    status: "active",
  }).lean();
};

exports.listParentStudents = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const parentId = req.auth.userId;

    const links = await ParentStudentLink.find({ schoolId, parentId, status: "active" })
      .select("studentId")
      .lean();

    const studentIds = links.map((link) => link.studentId);
    if (!studentIds.length) {
      return res.json(successResponse([]));
    }

    const students = await Student.find({ schoolId, _id: { $in: studentIds } })
      .select(STUDENT_SAFE_FIELDS)
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    return res.json(successResponse(students));
  } catch (err) {
    console.error("[listParentStudents] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load students"));
  }
};

exports.getParentStudent = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const parentId = req.auth.userId;
    const { id } = req.params;

    const link = await ensureActiveLink({ schoolId, parentId, studentId: id });
    if (!link) {
      return res.status(403).json(errorResponse("FORBIDDEN", "Access denied"));
    }

    const student = await Student.findOne({ _id: id, schoolId })
      .select(STUDENT_SAFE_FIELDS)
      .lean();

    if (!student) {
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", "Student not found"));
    }

    return res.json(successResponse(student));
  } catch (err) {
    console.error("[getParentStudent] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load student"));
  }
};

exports.getParentStudentTimeline = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const parentId = req.auth.userId;
    const { id } = req.params;

    const link = await ensureActiveLink({ schoolId, parentId, studentId: id });
    if (!link) {
      return res.status(403).json(errorResponse("FORBIDDEN", "Access denied"));
    }

    const [incidents, rewards, detentions, notes] = await Promise.all([
      Incident.find({ schoolId, studentId: id })
        .select("_id categoryId notes occurredAt severity status createdAt")
        .lean(),
      Reward.find({ schoolId, studentId: id })
        .select("_id categoryId minutesAwarded notes awardedAt createdAt")
        .lean(),
      Detention.find({ schoolId, studentId: id })
        .select("_id minutesAssigned minutesRemaining status scheduledFor servedAt createdAt")
        .lean(),
      Note.find({ schoolId, entityType: "student", entityId: id, visibleToParent: true })
        .select("_id text createdAt")
        .lean(),
    ]);

    const timeline = [
      ...incidents.map((item) => ({ type: "incident", date: item.occurredAt || item.createdAt, item })),
      ...rewards.map((item) => ({ type: "reward", date: item.awardedAt || item.createdAt, item })),
      ...detentions.map((item) => ({ type: "detention", date: item.createdAt, item })),
      ...notes.map((item) => ({ type: "note", date: item.createdAt, item })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json(successResponse(timeline));
  } catch (err) {
    console.error("[getParentStudentTimeline] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load timeline"));
  }
};
