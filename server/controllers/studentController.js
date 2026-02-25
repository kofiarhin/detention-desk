const mongoose = require("mongoose");

const Group = require("../models/Group");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");
const {
  loadStudentForRole,
  applyStudentOwnershipScope,
} = require("../services/studentAccessService");
const { findOrCreateGroupByLegacyFields, buildGroupLabel } = require("../services/groupService");

const studentPopulation = [{ path: "groupId", select: "code label year form ownerTeacherId" }];

const resolveGroup = async ({ schoolId, groupId, yearGroup, form }) => {
  if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
    return Group.findOne({ _id: groupId, schoolId });
  }

  if (!yearGroup || !form) return null;

  return findOrCreateGroupByLegacyFields({
    schoolId,
    yearGroup,
    form,
  });
};

exports.createStudent = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const {
      firstName,
      lastName,
      admissionNumber,
      groupId,
      yearGroup,
      form,
      status,
    } = req.body || {};

    if (!firstName) return res.status(400).json(errorResponse("VALIDATION_ERROR", "firstName is required"));
    if (!lastName) return res.status(400).json(errorResponse("VALIDATION_ERROR", "lastName is required"));
    if (!admissionNumber) return res.status(400).json(errorResponse("VALIDATION_ERROR", "admissionNumber is required"));
    if (!groupId && (!yearGroup || !form)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId is required"));
    }

    const group = await resolveGroup({ schoolId, groupId, yearGroup, form });

    if (!group) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId must belong to the active school"));
    }

    const student = await Student.create({
      schoolId,
      groupId: group._id,
      assignedTeacherId: group.ownerTeacherId || null,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      admissionNumber: String(admissionNumber).trim(),
      yearGroup: `Year ${group.year}`,
      form: group.form,
      status: status === "inactive" ? "inactive" : "active",
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });

    const payload = await Student.findById(student._id).populate(studentPopulation).lean();

    if (payload?.groupId) {
      payload.group = payload.groupId;
      payload.groupLabel = payload.groupId.label || buildGroupLabel({ year: payload.groupId.year, form: payload.groupId.form });
    }

    return res.status(201).json(successResponse(payload));
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
    const { q, groupId, status } = req.query || {};

    const filter = await applyStudentOwnershipScope(req);
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      filter.groupId = groupId;
    }
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
      Student.find(filter).populate(studentPopulation).sort(sort).skip(skip).limit(limit).lean(),
      Student.countDocuments(filter),
    ]);

    const normalizedItems = items.map((item) => ({
      ...item,
      group: item.groupId || null,
      groupLabel: item.groupId?.label || (item.yearGroup && item.form ? `${item.yearGroup}${item.form}` : null),
    }));

    return res.json(successResponse(normalizedItems, buildMeta({ page, limit, total })));
  } catch (err) {
    console.error("[listStudents]", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load students"));
  }
};

exports.getStudent = async (req, res) => {
  try {
    const student = await loadStudentForRole(req, req.params.id);
    if (!student) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));

    const payload = await Student.findById(student._id).populate(studentPopulation).lean();
    payload.group = payload.groupId || null;
    payload.groupLabel = payload.groupId?.label || (payload.yearGroup && payload.form ? `${payload.yearGroup}${payload.form}` : null);

    return res.json(successResponse(payload));
  } catch (err) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const teacherAllowed = ["firstName", "lastName", "status"];
    const adminAllowed = ["firstName", "lastName", "admissionNumber", "status", "groupId"];
    const allowed = req.auth.role === "teacher" ? teacherAllowed : adminAllowed;

    const patch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) patch[key] = req.body[key];
    }

    if (patch.groupId) {
      if (!mongoose.Types.ObjectId.isValid(patch.groupId)) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId is invalid"));
      }

      const group = await Group.findOne({ _id: patch.groupId, schoolId: req.auth.schoolId }).lean();
      if (!group) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId must belong to the active school"));
      }

      patch.assignedTeacherId = group.ownerTeacherId || null;
      patch.yearGroup = `Year ${group.year}`;
      patch.form = group.form;
    }

    patch.updatedBy = req.auth.userId;

    const filter = await applyStudentOwnershipScope(req, { _id: req.params.id });

    const updated = await Student.findOneAndUpdate(
      filter,
      { $set: patch },
      { new: true },
    ).populate(studentPopulation).lean();

    if (!updated) return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
    updated.group = updated.groupId || null;
    updated.groupLabel = updated.groupId?.label || (updated.yearGroup && updated.form ? `${updated.yearGroup}${updated.form}` : null);

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
    const filter = await applyStudentOwnershipScope(req, { _id: req.params.id });
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
