const Group = require("../models/Group");
const Student = require("../models/Student");

async function getOwnedGroupIds(req) {
  if (req.auth.role !== "teacher") return [];

  const groups = await Group.find(
    { schoolId: req.auth.schoolId, ownerTeacherId: req.auth.userId },
    { _id: 1 },
  ).lean();

  return groups.map((group) => group._id);
}

async function loadStudentForTeacherOrFail(req, studentId) {
  const schoolId = req.auth.schoolId;
  const ownedGroupIds = await getOwnedGroupIds(req);

  if (!ownedGroupIds.length) return null;

  return Student.findOne({
    _id: studentId,
    schoolId,
    groupId: { $in: ownedGroupIds },
  });
}

async function loadStudentForRole(req, studentId) {
  const schoolId = req.auth.schoolId;

  if (req.auth.role !== "teacher") {
    return Student.findOne({ _id: studentId, schoolId });
  }

  return loadStudentForTeacherOrFail(req, studentId);
}

function applyStudentScope(req, filter = {}) {
  const scopedFilter = {
    ...filter,
    schoolId: req.auth.schoolId,
  };

  if (req.auth.role === "teacher") {
    scopedFilter.assignedTeacherId = req.auth.userId;
  }

  return scopedFilter;
}

async function applyStudentOwnershipScope(req, filter = {}) {
  const scopedFilter = {
    ...filter,
    schoolId: req.auth.schoolId,
  };

  if (req.auth.role === "teacher") {
    const ownedGroupIds = await getOwnedGroupIds(req);
    scopedFilter.groupId = { $in: ownedGroupIds };
  }

  return scopedFilter;
}

module.exports = {
  loadStudentForTeacherOrFail,
  loadStudentForRole,
  applyStudentScope,
  applyStudentOwnershipScope,
  getOwnedGroupIds,
};
