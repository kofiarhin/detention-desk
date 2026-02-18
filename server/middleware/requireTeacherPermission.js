const SchoolPolicy = require("../models/SchoolPolicy");
const { errorResponse } = require("../utils/response");

const PERMISSION_ALIASES = {
  canAwardRewards: "canCreateRewards",
};

function isAdminRole(role) {
  return role === "schoolAdmin" || role === "admin";
}

function resolveFlag(flag) {
  return PERMISSION_ALIASES[flag] || flag;
}

function requireTeacherPermission(flag) {
  const permissionKey = resolveFlag(flag);

  return async (req, res, next) => {
    const { role, schoolId } = req.auth || {};

    if (isAdminRole(role)) return next();

    if (role !== "teacher") {
      return res
        .status(403)
        .json(errorResponse("FORBIDDEN", "Insufficient permissions"));
    }

    try {
      const policy = req.schoolPolicy || (await SchoolPolicy.findOne({ schoolId }).lean());
      if (!req.schoolPolicy && policy) req.schoolPolicy = policy;

      if (!policy?.teacherPermissions || policy.teacherPermissions[permissionKey] !== true) {
        return res
          .status(403)
          .json(errorResponse("FORBIDDEN", "Insufficient permissions"));
      }

      return next();
    } catch (err) {
      return res
        .status(500)
        .json(errorResponse("SERVER_ERROR", "Could not load school policy"));
    }
  };
}

module.exports = { requireTeacherPermission };
