const { errorResponse } = require("../utils/response");

function requireTenant(req, res, next) {
  const { role, schoolId } = req.auth || {};

  // Owner is global and does not belong to any tenant by default
  if (role === "owner") {
    return res
      .status(403)
      .json(errorResponse("FORBIDDEN", "Owner cannot access tenant routes"));
  }

  if (!schoolId) {
    return res
      .status(401)
      .json(errorResponse("TENANT_REQUIRED", "Tenant context required"));
  }

  return next();
}

module.exports = { requireTenant };
