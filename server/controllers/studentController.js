const Student = require("../models/Student");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");
const { loadStudentForRole, applyStudentScope } = require("../services/studentAccessService");

exports.createStudent = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { firstName, lastName, admissionNumber, yearGroup, form, status } = req.body || {};

    if (!firstName) return res.status(400).json(errorResponse("VALIDATION_ERROR", "firstName is required"));
    if (!lastName) return res.status(400).json(errorResponse("VALIDATION_ERROR", "lastName is required"));
    if (!admissionNumber) return res.status(400).json(errorResponse("VALIDATION_ERROR", "admissionNumber is required"));
    if (!yearGroup) return res.status(400).json(errorResponse("VALIDATION_ERROR", "yearGroup is required"));
    if (!form) return res.status(400).json(errorResponse("VALIDATION_ERROR", "form is required"));

    let assignedTeacherId = req.auth.userId;

    if (req.auth.role === "schoolAdmin") {
      if (!req.body?.assignedTeacherId) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "assignedTeacherId is required"));
      }

      const teacher = await User.findOne({
        _id: req.body.assignedTeacherId,
        schoolId,
        role: "teacher",
      }).lean();

      if (!teacher) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "assignedTeacherId must be an active tenant teacher"));
      }

      assignedTeacherId = teacher._id;
    }

    const student = await Student.create({
      schoolId,
      assignedTeacherId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      admissionNumber: String(admissionNumber).trim(),
      yearGroup: String(yearGroup).trim(),
      form: String(form).trim(),
      status: status === "inactive" ? "inactive" : "active",
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });

    return res.status(201).json(successResponse(student));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("DUPLICATE", "Admission number already exists"));
    }
    console.error("[createStudent]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not create student"));
  }
};

exports.listStudents = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parseListQuery(req.query || {});
    const { q, yearGroup, form, status } = req.query || {};

    const filter = applyStudentScope(req);
    if (yearGroup) filter.yearGroup = String(yearGroup);
    if (form) filter.form = String(form);
    if (status) filter.status = String(status);

    if (q) {
      const term = String(q).trim();
      filter.$or = [
        { firstName: { $regex: term, $options: "i" } },
        { lastName: { $regex: term, $options: "i" } },
        { admissionNumber: { $regex: term, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Student.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Student.countDocuments(filter),
    ]);

    return res.json(successResponse(items, buildMeta({ page, limit, total })));
  } catch (err) {
    console.error("[listStudents]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load students"));
  }
};

exports.getStudent = async (req, res) => {
  try {
    const student = await loadStudentForRole(req, req.params.id);
    if (!student) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
    return res.json(successResponse(student));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const teacherAllowed = ["firstName", "lastName", "yearGroup", "form", "status"];
    const adminAllowed = ["firstName", "lastName", "admissionNumber", "yearGroup", "form", "status"];
    const allowed = req.auth.role === "teacher" ? teacherAllowed : adminAllowed;

    const patch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) patch[key] = req.body[key];
    }

    patch.updatedBy = req.auth.userId;

    const filter = applyStudentScope(req, { _id: req.params.id });

    const updated = await Student.findOneAndUpdate(
      filter,
      { $set: patch },
      { new: true },
    ).lean();

    if (!updated) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
    return res.json(successResponse(updated));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("DUPLICATE", "Admission number already exists"));
    }
    console.error("[updateStudent]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update student"));
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const filter = applyStudentScope(req, { _id: req.params.id });
    const updated = await Student.findOneAndUpdate(
      filter,
      { $set: { status: "inactive", updatedBy: req.auth.userId } },
      { new: true },
    ).lean();

    if (!updated) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
    return res.json(successResponse(updated));
  } catch (err) {
    console.error("[deleteStudent]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not delete student"));
  }
};
