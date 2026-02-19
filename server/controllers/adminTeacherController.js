const User = require("../models/User");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");

exports.createTeacher = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { name, email, password } = req.body || {};

    if (!name) return res.status(400).json(errorResponse("VALIDATION_ERROR", "name is required"));
    if (!email) return res.status(400).json(errorResponse("VALIDATION_ERROR", "email is required"));
    if (!password) return res.status(400).json(errorResponse("VALIDATION_ERROR", "password is required"));

    const passwordHash = await User.hashPassword(password);
    const teacher = await User.create({
      schoolId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
      role: "teacher",
      status: "active",
    });

    return res.status(201).json(successResponse({
      id: String(teacher._id),
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      status: teacher.status,
    }));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("DUPLICATE", "Email already exists"));
    }
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not create teacher"));
  }
};

exports.listTeachers = async (req, res) => {
  try {
    const { page, limit, skip } = parseListQuery(req.query || {});
    const filter = { schoolId: req.auth.schoolId, role: "teacher" };
    const [items, total] = await Promise.all([
      User.find(filter, { passwordHash: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    return res.json(successResponse(items, buildMeta({ page, limit, total })));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load teachers"));
  }
};

async function setTeacherStatus(req, res, status) {
  const teacher = await User.findOneAndUpdate(
    { _id: req.params.id, schoolId: req.auth.schoolId, role: "teacher" },
    { $set: { status } },
    { new: true },
  ).lean();

  if (!teacher) return res.status(404).json(errorResponse("NOT_FOUND", "Teacher not found"));
  return res.json(successResponse({ id: String(teacher._id), status: teacher.status }));
}

exports.deactivateTeacher = async (req, res) => {
  try {
    return setTeacherStatus(req, res, "inactive");
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not deactivate teacher"));
  }
};

exports.reactivateTeacher = async (req, res) => {
  try {
    return setTeacherStatus(req, res, "active");
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not reactivate teacher"));
  }
};

exports.reassignStudent = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { assignedTeacherId } = req.body || {};

    if (!assignedTeacherId) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "assignedTeacherId is required"));
    }

    const student = await Student.findOne({ _id: req.params.id, schoolId });
    if (!student) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));

    const teacher = await User.findOne({
      _id: assignedTeacherId,
      schoolId,
      role: "teacher",
    }).lean();

    if (!teacher) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "assignedTeacherId must be a tenant teacher"));
    }

    student.assignedTeacherId = teacher._id;
    student.updatedBy = req.auth.userId;
    await student.save();

    return res.json(successResponse({
      id: String(student._id),
      assignedTeacherId: String(student.assignedTeacherId),
      updatedBy: String(student.updatedBy),
    }));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not reassign student"));
  }
};
