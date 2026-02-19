const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { errorResponse } = require("../utils/response");

const PARENT_ALLOWED_PATHS = new Set([
  "/auth/me",
  "/api/auth/me",
  "/auth/change-password",
  "/api/auth/change-password",
]);

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json(errorResponse("AUTH_REQUIRED", "Missing token"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { userId, role } = payload || {};

    if (!userId || !role) {
      return res
        .status(401)
        .json(errorResponse("INVALID_TOKEN", "Invalid token payload"));
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res
        .status(401)
        .json(errorResponse("INVALID_TOKEN", "Invalid token"));
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json(errorResponse("ACCOUNT_INACTIVE", "Account is inactive"));
    }

    req.auth = {
      userId: String(user._id),
      schoolId: user.schoolId ? String(user.schoolId) : null,
      role: user.role,
    };

    req.user = {
      id: String(user._id),
      schoolId: user.schoolId ? String(user.schoolId) : null,
      role: user.role,
      status: user.status,
      mustChangePassword: Boolean(user.mustChangePassword),
    };

    if (
      req.user.role === "parent" &&
      req.user.mustChangePassword === true &&
      !PARENT_ALLOWED_PATHS.has(req.baseUrl + req.path)
    ) {
      return res.status(403).json({
        message: "Password change required",
        code: "PASSWORD_RESET_REQUIRED",
        details: {},
      });
    }

    return next();
  } catch (e) {
    return res
      .status(401)
      .json(errorResponse("INVALID_TOKEN", "Invalid token"));
  }
}

module.exports = { requireAuth };
