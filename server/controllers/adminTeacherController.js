const mongoose = require("mongoose");

const Group = require("../models/Group");
const User = require("../models/User");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");

const teacherProjection = { passwordHash: 0 };

const mapTeacherWithGroup = (teacher, group) => ({
  ...teacher,
  ownedGroup: group
    ? {
      id: String(group._id),
      code: group.code,
      label: group.label,
      year: group.year,
      form: group.form,
    }
    : null,
});

exports.createTeacher = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { name, email, password, groupId } = req.body || {};

    if (!name) return res.status(400).json(errorResponse("VALIDATION_ERROR", "name is required"));
    if (!email) return res.status(400).json(errorResponse("VALIDATION_ERROR", "email is required"));
    if (!password) return res.status(400).json(errorResponse("VALIDATION_ERROR", "password is required"));
    if (!groupId) return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId is required"));
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId is invalid"));
    }

    const group = await Group.findOne({ _id: groupId, schoolId });

    if (!group) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId must belong to the active school"));
    }

    if (group.ownerTeacherId) {
      return res.status(409).json(errorResponse("GROUP_OWNED", "Selected group already has an owner"));
    }

    const passwordHash = await User.hashPassword(password);
    const teacher = await User.create({
      schoolId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
      role: "teacher",
      status: "active",
    });

    group.ownerTeacherId = teacher._id;
    await group.save();

    return res.status(201).json(successResponse({
      id: String(teacher._id),
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      status: teacher.status,
      ownedGroup: {
        id: String(group._id),
        code: group.code,
        label: group.label,
      },
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
    const [items, total, groups] = await Promise.all([
      User.find(filter, teacherProjection).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
      Group.find({ schoolId: req.auth.schoolId, ownerTeacherId: { $ne: null } }).lean(),
    ]);

    const groupByTeacherId = new Map(
      groups
        .filter((item) => item.ownerTeacherId)
        .map((group) => [String(group.ownerTeacherId), group]),
    );

    const payload = items.map((teacher) => mapTeacherWithGroup(teacher, groupByTeacherId.get(String(teacher._id))));

    return res.json(successResponse(payload, buildMeta({ page, limit, total })));
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

exports.reassignTeacherGroup = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { teacherId } = req.params;
    const { groupId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "teacherId is invalid"));
    }

    const teacher = await User.findOne({
      _id: teacherId,
      schoolId,
      role: "teacher",
    }).lean();

    if (!teacher) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Teacher not found"));
    }

    const currentGroup = await Group.findOne({ schoolId, ownerTeacherId: teacherId });
    const currentGroupId = currentGroup ? String(currentGroup._id) : null;

    if (groupId === null) {
      if (currentGroup) {
        currentGroup.ownerTeacherId = null;
        await currentGroup.save();
        await Student.updateMany(
          { schoolId, groupId: currentGroup._id },
          { $set: { assignedTeacherId: null } },
        );
      }

      return res.json(successResponse(mapTeacherWithGroup(teacher, null)));
    }

    if (!groupId) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId is required or null"));
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "groupId is invalid"));
    }

    const newGroup = await Group.findOne({ _id: groupId, schoolId });

    if (!newGroup) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Group not found"));
    }

    if (newGroup.ownerTeacherId && String(newGroup.ownerTeacherId) !== String(teacherId)) {
      return res.status(409).json(errorResponse("GROUP_OWNED", "Selected group already has an owner"));
    }

    if (currentGroup && currentGroupId !== String(newGroup._id)) {
      currentGroup.ownerTeacherId = null;
      await currentGroup.save();
      await Student.updateMany(
        { schoolId, groupId: currentGroup._id },
        { $set: { assignedTeacherId: null } },
      );
    }

    newGroup.ownerTeacherId = teacherId;
    await newGroup.save();

    await Student.updateMany(
      { schoolId, groupId: newGroup._id },
      { $set: { assignedTeacherId: teacherId } },
    );

    const ownedGroup = await Group.findOne({ schoolId, ownerTeacherId: teacherId }).lean();
    return res.json(successResponse(mapTeacherWithGroup(teacher, ownedGroup)));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("GROUP_OWNERSHIP_CONFLICT", "Teacher already owns another group"));
    }
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not reassign teacher group"));
  }
};

exports.listGroups = async (req, res) => {
  try {
    const groups = await Group.find({ schoolId: req.auth.schoolId })
      .populate("ownerTeacherId", "name email status role")
      .sort({ year: 1, form: 1 })
      .lean();

    return res.json(successResponse(groups));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load groups"));
  }
};

exports.assignGroupOwner = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { ownerTeacherId } = req.body || {};

    const group = await Group.findOne({ _id: req.params.id, schoolId });
    if (!group) return res.status(404).json(errorResponse("NOT_FOUND", "Group not found"));

    let nextOwnerId = null;

    if (ownerTeacherId !== null && ownerTeacherId !== undefined && ownerTeacherId !== "") {
      if (!mongoose.Types.ObjectId.isValid(ownerTeacherId)) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "ownerTeacherId is invalid"));
      }

      const teacher = await User.findOne({
        _id: ownerTeacherId,
        schoolId,
        role: "teacher",
      }).lean();

      if (!teacher) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "ownerTeacherId must be a tenant teacher"));
      }

      const existingOwnership = await Group.findOne({
        schoolId,
        ownerTeacherId,
        _id: { $ne: group._id },
      }).lean();

      if (existingOwnership) {
        return res.status(409).json(errorResponse("GROUP_OWNERSHIP_CONFLICT", "Teacher already owns another group"));
      }

      nextOwnerId = teacher._id;
    }

    group.ownerTeacherId = nextOwnerId;
    await group.save();

    await Student.updateMany(
      { schoolId, groupId: group._id },
      { $set: { assignedTeacherId: nextOwnerId } },
    );

    const updated = await Group.findById(group._id)
      .populate("ownerTeacherId", "name email status role")
      .lean();

    return res.json(successResponse(updated));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("GROUP_OWNERSHIP_CONFLICT", "Teacher already owns another group"));
    }
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update group owner"));
  }
};
