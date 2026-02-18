const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");

exports.createStudent = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { firstName, lastName, admissionNumber, yearGroup, form, status } = req.body || {};

    if (!firstName) return res.status(400).json(errorResponse("VALIDATION_ERROR", "firstName is required"));
    if (!lastName) return res.status(400).json(errorResponse("VALIDATION_ERROR", "lastName is required"));
    if (!admissionNumber) return res.status(400).json(errorResponse("VALIDATION_ERROR", "admissionNumber is required"));
    if (!yearGroup) return res.status(400).json(errorResponse("VALIDATION_ERROR", "yearGroup is required"));
    if (!form) return res.status(400).json(errorResponse("VALIDATION_ERROR", "form is required"));

    const student = await Student.create({
      schoolId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      admissionNumber: String(admissionNumber).trim(),
      yearGroup: String(yearGroup).trim(),
      form: String(form).trim(),
      status: status === "inactive" ? "inactive" : "active",
      createdBy: req.auth.userId,
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
    const schoolId = req.auth.schoolId;
    const { page, limit, skip, sort } = parseListQuery(req.query || {});
    const { q, yearGroup, form, status } = req.query || {};

    const filter = { schoolId };
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
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.auth.schoolId }).lean();
    if (!student) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
    return res.json(successResponse(student));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const allowed = ["firstName", "lastName", "admissionNumber", "yearGroup", "form", "status"];
    const patch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) patch[key] = req.body[key];
    }

    const updated = await Student.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.auth.schoolId },
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
    const updated = await Student.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.auth.schoolId },
      { $set: { status: "inactive" } },
      { new: true },
    ).lean();

    if (!updated) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
    return res.json(successResponse(updated));
  } catch (err) {
    console.error("[deleteStudent]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not delete student"));
  }
};
