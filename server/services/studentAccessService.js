const Student = require("../models/Student");

async function loadStudentForTeacherOrFail(req, studentId) {
  const schoolId = req.auth.schoolId;
  const userId = req.auth.userId;

  return Student.findOne({
    _id: studentId,
    schoolId,
    assignedTeacherId: userId,
  });
}

async function loadStudentForRole(req, studentId) {
  const schoolId = req.auth.schoolId;
  const filter = { _id: studentId, schoolId };

  if (req.auth.role === "teacher") {
    filter.assignedTeacherId = req.auth.userId;
  }

  return Student.findOne(filter);
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

module.exports = { loadStudentForTeacherOrFail, loadStudentForRole, applyStudentScope };
