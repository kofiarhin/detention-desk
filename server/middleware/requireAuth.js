const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json(errorResponse("AUTH_REQUIRED", "Missing token"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, schoolId, role } = payload || {};

    if (!userId || !role) {
      return res
        .status(401)
        .json(errorResponse("INVALID_TOKEN", "Invalid token payload"));
    }

    req.auth = {
      userId: String(userId),
      schoolId: schoolId ? String(schoolId) : null,
      role: String(role),
    };

    return next();
  } catch (e) {
    return res
      .status(401)
      .json(errorResponse("INVALID_TOKEN", "Invalid token"));
  }
}

module.exports = { requireAuth };
