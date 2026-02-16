const jwt = require("jsonwebtoken");

function signToken({ userId, schoolId, role }) {
  const payload = {
    userId: String(userId),
    role: String(role),
    schoolId: schoolId ? String(schoolId) : null,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

module.exports = { signToken };
