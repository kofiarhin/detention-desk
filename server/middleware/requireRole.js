const { errorResponse } = require("../utils/response");

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res
        .status(403)
        .json(errorResponse("FORBIDDEN", "Insufficient permissions"));
    }
    return next();
  };
}

module.exports = { requireRole };
