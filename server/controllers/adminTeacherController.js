const mongoose = require("mongoose");

const Group = require("../models/Group");
const User = require("../models/User");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/response");
const { parseListQuery, buildMeta } = require("../services/queryService");

const teacherProjection = { passwordHash: 0 };

const toTeacherPayload = (teacher) => ({
  id: String(teacher._id),
  name: teacher.name,
  email: teacher.email,
  role: teacher.role,
  status: teacher.status,
  createdAt: teacher.createdAt,
  updatedAt: teacher.updatedAt,
});

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

exports.getTeacherDetails = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { teacherId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "teacherId is invalid"));
    }

    const teacher = await User.findOne({
      _id: teacherId,
      schoolId,
      role: "teacher",
    }, teacherProjection).lean();

    if (!teacher) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Teacher not found"));
    }

    const group = await Group.findOne({ schoolId, ownerTeacherId: teacherId }).lean();
    const studentCount = group
      ? await Student.countDocuments({ schoolId, groupId: group._id })
      : 0;

    return res.json(successResponse({
      ...toTeacherPayload(teacher),
      ownedGroup: group
        ? {
          id: String(group._id),
          code: group.code,
          label: group.label,
          year: group.year,
          form: group.form,
        }
        : null,
      studentCount,
    }));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load teacher details"));
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { teacherId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "teacherId is invalid"));
    }

    const { name, email } = req.body || {};
    const updates = {};

    if (name !== undefined) {
      const nextName = String(name || "").trim();
      if (!nextName) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "name is required"));
      }
      updates.name = nextName;
    }

    if (email !== undefined) {
      const nextEmail = String(email || "").trim().toLowerCase();
      if (!nextEmail) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "email is required"));
      }
      updates.email = nextEmail;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "No valid fields to update"));
    }

    const teacher = await User.findOne({
      _id: teacherId,
      schoolId,
      role: "teacher",
    });

    if (!teacher) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Teacher not found"));
    }

    Object.assign(teacher, updates);
    await teacher.save();

    return res.json(successResponse(toTeacherPayload(teacher)));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("DUPLICATE", "Email already exists"));
    }
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update teacher"));
  }
};

exports.updateTeacherStatus = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { teacherId } = req.params;
    const { isActive } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "teacherId is invalid"));
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "isActive must be boolean"));
    }

    const teacher = await User.findOneAndUpdate(
      { _id: teacherId, schoolId, role: "teacher" },
      { $set: { status: isActive ? "active" : "inactive" } },
      { new: true },
    ).lean();

    if (!teacher) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Teacher not found"));
    }

    return res.json(successResponse(toTeacherPayload(teacher)));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update teacher status"));
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


const runWithTransactionFallback = async (operation) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await operation(session);
    });
  } catch (err) {
    const message = String(err?.message || "");
    if (message.includes("Transaction numbers are only allowed") || message.includes("Transaction is not supported")) {
      await operation(null);
      return;
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.reassignTeacherGroup = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { teacherId } = req.params;
    const { groupId, newGroupId, transferStudents } = req.body || {};
    const requestedGroupId = newGroupId !== undefined ? newGroupId : groupId;
    const shouldTransferStudents = transferStudents === true;

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

    if (requestedGroupId === null) {
      await runWithTransactionFallback(async (session) => {
        if (currentGroup) {
          currentGroup.ownerTeacherId = null;
          await currentGroup.save(session ? { session } : undefined);
          await Student.updateMany(
            { schoolId, groupId: currentGroup._id },
            { $set: { assignedTeacherId: null } },
            session ? { session } : undefined,
          );
        }
      });

      return res.json(successResponse(mapTeacherWithGroup(teacher, null)));
    }

    if (!requestedGroupId) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "newGroupId is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(requestedGroupId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "newGroupId is invalid"));
    }

    const newGroup = await Group.findOne({ _id: requestedGroupId, schoolId });

    if (!newGroup) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Group not found"));
    }

    if (newGroup.ownerTeacherId && String(newGroup.ownerTeacherId) !== String(teacherId)) {
      return res.status(409).json(errorResponse("GROUP_OWNED", "Selected group already has an owner"));
    }

    await runWithTransactionFallback(async (session) => {
      if (currentGroup && currentGroupId !== String(newGroup._id)) {
        currentGroup.ownerTeacherId = null;
        await currentGroup.save(session ? { session } : undefined);

        if (shouldTransferStudents) {
          await Student.updateMany(
            { schoolId, groupId: currentGroup._id },
            { $set: { groupId: newGroup._id, assignedTeacherId: teacherId } },
            session ? { session } : undefined,
          );
        } else {
          await Student.updateMany(
            { schoolId, groupId: currentGroup._id },
            { $set: { assignedTeacherId: null } },
            session ? { session } : undefined,
          );
        }
      }

      newGroup.ownerTeacherId = teacherId;
      await newGroup.save(session ? { session } : undefined);

      await Student.updateMany(
        { schoolId, groupId: newGroup._id },
        { $set: { assignedTeacherId: teacherId } },
        session ? { session } : undefined,
      );
    });

    const ownedGroup = await Group.findOne({ schoolId, ownerTeacherId: teacherId }).lean();
    const studentCount = ownedGroup
      ? await Student.countDocuments({ schoolId, groupId: ownedGroup._id })
      : 0;

    return res.json(successResponse({
      ...mapTeacherWithGroup(teacher, ownedGroup),
      studentCount,
    }));
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
