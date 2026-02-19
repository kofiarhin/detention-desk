const Incident = require("../models/Incident");
const Category = require("../models/Category");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");
const {
  loadStudentForRole,
  loadStudentForTeacherOrFail,
  applyStudentScope,
} = require("../services/studentAccessService");
const {
  getIncidentDetentionMinutes,
  createDetentionForIncident,
} = require("../services/detentionService");

exports.createIncident = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { studentId, categoryId, notes, occurredAt, severity } = req.body || {};

    if (!studentId) return res.status(400).json(errorResponse("VALIDATION_ERROR", "studentId is required"));
    if (!categoryId) return res.status(400).json(errorResponse("VALIDATION_ERROR", "categoryId is required"));
    if (!occurredAt) return res.status(400).json(errorResponse("VALIDATION_ERROR", "occurredAt is required"));

    const student = req.auth.role === "teacher"
      ? await loadStudentForTeacherOrFail(req, studentId)
      : await loadStudentForRole(req, studentId);

    if (!student) {
      return res.status(req.auth.role === "teacher" ? 403 : 400).json(errorResponse(req.auth.role === "teacher" ? "FORBIDDEN" : "VALIDATION_ERROR", req.auth.role === "teacher" ? "Student not assigned to teacher" : "Invalid studentId"));
    }

    const category = await Category.findOne({ _id: categoryId, schoolId, type: "behaviour" }).lean();
    if (!category) return res.status(400).json(errorResponse("VALIDATION_ERROR", "Invalid behaviour categoryId"));

    const incident = await Incident.create({
      schoolId,
      studentId,
      assignedTeacherId: student.assignedTeacherId,
      categoryId,
      notes: notes || "",
      occurredAt,
      severity: severity || null,
      reportedBy: req.auth.userId,
    });

    const detentionMinutes = await getIncidentDetentionMinutes({ schoolId, categoryId });
    if (detentionMinutes && detentionMinutes > 0) {
      await createDetentionForIncident({
        schoolId,
        studentId,
        assignedTeacherId: student.assignedTeacherId,
        incidentId: incident._id,
        createdBy: req.auth.userId,
        minutes: detentionMinutes,
      });
    }

    return res.status(201).json(successResponse(incident));
  } catch (err) {
    console.error("[createIncident]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not create incident"));
  }
};

exports.listIncidents = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parseListQuery(req.query || {});
    const { studentId, categoryId, status, from, to } = req.query || {};
    const filter = applyStudentScope(req);
    if (studentId) filter.studentId = studentId;
    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;
    if (from || to) {
      filter.occurredAt = {};
      if (from) filter.occurredAt.$gte = new Date(from);
      if (to) filter.occurredAt.$lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      Incident.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Incident.countDocuments(filter),
    ]);

    return res.json(successResponse(items, buildMeta({ page, limit, total })));
  } catch (err) {
    console.error("[listIncidents]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load incidents"));
  }
};

exports.getIncident = async (req, res) => {
  try {
    const filter = applyStudentScope(req, { _id: req.params.id });
    const item = await Incident.findOne(filter).lean();
    if (!item) return res.status(404).json(errorResponse("NOT_FOUND", "Incident not found"));
    return res.json(successResponse(item));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Incident not found"));
  }
};

exports.updateIncident = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const filter = applyStudentScope(req, { _id: req.params.id, schoolId });
    const existing = await Incident.findOne(filter);
    if (!existing) return res.status(404).json(errorResponse("NOT_FOUND", "Incident not found"));

    if (req.auth.role === "teacher") {
      const student = await loadStudentForTeacherOrFail(req, existing.studentId);
      if (!student) return res.status(403).json(errorResponse("FORBIDDEN", "Student not assigned to teacher"));
    }

    const allowed = ["notes", "occurredAt", "severity", "status"];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) existing[key] = req.body[key];
    }

    await existing.save();
    return res.json(successResponse(existing));
  } catch (err) {
    console.error("[updateIncident]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update incident"));
  }
};

exports.deleteIncident = async (req, res) => {
  try {
    const filter = applyStudentScope(req, { _id: req.params.id, schoolId: req.auth.schoolId });
    const existing = await Incident.findOne(filter);
    if (!existing) return res.status(404).json(errorResponse("NOT_FOUND", "Incident not found"));

    if (req.auth.role === "teacher") {
      const student = await loadStudentForTeacherOrFail(req, existing.studentId);
      if (!student) return res.status(403).json(errorResponse("FORBIDDEN", "Student not assigned to teacher"));
    }

    existing.status = "voided";
    await existing.save();

    return res.json(successResponse(existing));
  } catch (err) {
    console.error("[deleteIncident]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not delete incident"));
  }
};
