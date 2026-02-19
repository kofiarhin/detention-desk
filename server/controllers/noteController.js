const Note = require("../models/Note");
const Incident = require("../models/Incident");
const Detention = require("../models/Detention");
const Reward = require("../models/Reward");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");
const { loadStudentForRole, loadStudentForTeacherOrFail, applyStudentScope } = require("../services/studentAccessService");

async function resolveStudentForEntity({ schoolId, entityType, entityId }) {
  if (entityType === "student") {
    return { studentId: entityId };
  }

  const map = {
    incident: Incident,
    detention: Detention,
    reward: Reward,
  };

  const Model = map[entityType];
  if (!Model) return null;

  const doc = await Model.findOne({ _id: entityId, schoolId }, { studentId: 1 }).lean();
  if (!doc) return null;

  return { studentId: doc.studentId };
}

exports.createNote = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { entityType, entityId, text } = req.body || {};

    if (!entityType) return res.status(400).json(errorResponse("VALIDATION_ERROR", "entityType is required"));
    if (!entityId) return res.status(400).json(errorResponse("VALIDATION_ERROR", "entityId is required"));
    if (!text) return res.status(400).json(errorResponse("VALIDATION_ERROR", "text is required"));

    const resolution = await resolveStudentForEntity({ schoolId, entityType, entityId });
    if (!resolution) return res.status(400).json(errorResponse("VALIDATION_ERROR", "Entity not found in tenant"));

    const student = req.auth.role === "teacher"
      ? await loadStudentForTeacherOrFail(req, resolution.studentId)
      : await loadStudentForRole(req, resolution.studentId);

    if (!student) {
      return res.status(req.auth.role === "teacher" ? 403 : 400).json(errorResponse(req.auth.role === "teacher" ? "FORBIDDEN" : "VALIDATION_ERROR", req.auth.role === "teacher" ? "Student not assigned to teacher" : "Invalid studentId"));
    }

    const note = await Note.create({
      schoolId,
      studentId: student._id,
      assignedTeacherId: student.assignedTeacherId,
      entityType,
      entityId,
      text,
      authorId: req.auth.userId,
    });

    return res.status(201).json(successResponse(note));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not create note"));
  }
};

exports.listNotes = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parseListQuery(req.query || {});
    const { entityType, entityId } = req.query || {};
    const filter = applyStudentScope(req);
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;

    const [items, total] = await Promise.all([
      Note.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Note.countDocuments(filter),
    ]);

    return res.json(successResponse(items, buildMeta({ page, limit, total })));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load notes"));
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const filter = applyStudentScope(req, { _id: req.params.id });
    const note = await Note.findOne(filter);
    if (!note) return res.status(404).json(errorResponse("NOT_FOUND", "Note not found"));

    const isAdmin = req.auth.role === "schoolAdmin";
    const isAuthor = String(note.authorId) === String(req.auth.userId);
    if (!isAdmin && !isAuthor) {
      return res.status(403).json(errorResponse("FORBIDDEN", "Cannot delete this note"));
    }

    await note.deleteOne();
    return res.json(successResponse({ deleted: true }));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not delete note"));
  }
};
