const School = require("../models/School");
const SchoolPolicy = require("../models/SchoolPolicy");
const User = require("../models/User");

const { successResponse, errorResponse } = require("../utils/response");
const { normalizeSchoolCode, normalizeEmail } = require("../utils/normalize");
const { signToken } = require("../services/tokenService");

exports.login = async (req, res) => {
  try {
    const { schoolCode, email, password } = req.body || {};
    if (!schoolCode || !email || !password) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing required fields"));
    }

    const codeNorm = normalizeSchoolCode(schoolCode);
    const school = await School.findOne({
      schoolCodeNormalized: codeNorm,
    }).lean();
    if (!school)
      return res
        .status(401)
        .json(errorResponse("INVALID_LOGIN", "Invalid credentials"));

    const emailNorm = normalizeEmail(email);
    const user = await User.findOne({
      schoolId: school._id,
      emailNormalized: emailNorm,
    });
    if (!user)
      return res
        .status(401)
        .json(errorResponse("INVALID_LOGIN", "Invalid credentials"));

    const ok = await user.verifyPassword(password);
    if (!ok)
      return res
        .status(401)
        .json(errorResponse("INVALID_LOGIN", "Invalid credentials"));

    if (user.role === "owner") {
      return res
        .status(403)
        .json(errorResponse("FORBIDDEN", "Use owner login"));
    }

    const token = signToken({
      userId: user._id,
      schoolId: school._id,
      role: user.role,
    });

    return res.json(
      successResponse({
        token,
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        school: {
          id: String(school._id),
          name: school.name,
          schoolCode: school.schoolCode,
          status: school.status,
        },
      }),
    );
  } catch (err) {
    console.error("[login] error:", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Login failed"));
  }
};

exports.ownerLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing required fields"));
    }

    const emailNorm = normalizeEmail(email);
    const owner = await User.findOne({
      role: "owner",
      emailNormalized: emailNorm,
    });
    if (!owner)
      return res
        .status(401)
        .json(errorResponse("INVALID_LOGIN", "Invalid credentials"));

    const ok = await owner.verifyPassword(password);
    if (!ok)
      return res
        .status(401)
        .json(errorResponse("INVALID_LOGIN", "Invalid credentials"));

    const token = signToken({
      userId: owner._id,
      schoolId: null,
      role: "owner",
    });

    return res.json(
      successResponse({
        token,
        user: {
          id: String(owner._id),
          name: owner.name,
          email: owner.email,
          role: owner.role,
        },
      }),
    );
  } catch (err) {
    console.error("[ownerLogin] error:", err);
    return res.status(500).json(errorResponse("SERVER_ERROR", "Login failed"));
  }
};

exports.bootstrapOwner = async (req, res) => {
  try {
    const secret = req.headers["x-bootstrap-secret"];
    if (
      !process.env.OWNER_BOOTSTRAP_SECRET ||
      secret !== process.env.OWNER_BOOTSTRAP_SECRET
    ) {
      return res
        .status(403)
        .json(errorResponse("FORBIDDEN", "Invalid bootstrap secret"));
    }

    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing required fields"));
    }

    const emailNorm = normalizeEmail(email);
    const exists = await User.findOne({
      role: "owner",
      emailNormalized: emailNorm,
    }).lean();
    if (exists)
      return res
        .status(409)
        .json(errorResponse("OWNER_EXISTS", "Owner already exists"));

    const passwordHash = await User.hashPassword(password);

    const owner = await User.create({
      schoolId: null,
      name: String(name).trim(),
      email: emailNorm,
      passwordHash,
      role: "owner",
    });

    return res.status(201).json(
      successResponse({
        id: String(owner._id),
        name: owner.name,
        email: owner.email,
        role: owner.role,
      }),
    );
  } catch (err) {
    console.error("[bootstrapOwner] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Bootstrap failed"));
  }
};

exports.me = async (req, res) => {
  try {
    const { userId, role, schoolId } = req.auth;

    const user = await User.findById(userId).lean();
    if (!user)
      return res
        .status(401)
        .json(errorResponse("AUTH_REQUIRED", "Invalid session"));

    if (role === "owner") {
      return res.json(
        successResponse({
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        }),
      );
    }

    if (!schoolId) {
      return res
        .status(401)
        .json(errorResponse("TENANT_REQUIRED", "Tenant context required"));
    }

    const school = await School.findById(schoolId).lean();
    const policy = await SchoolPolicy.findOne({ schoolId }).lean();

    return res.json(
      successResponse({
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        school: school
          ? {
              id: String(school._id),
              name: school.name,
              schoolCode: school.schoolCode,
              status: school.status,
            }
          : null,
        policy: policy
          ? {
              id: String(policy._id),
              defaultDetentionMinutes: policy.defaultDetentionMinutes,
              rewardOffsetMinutes: policy.rewardOffsetMinutes,
              teacherPermissions: policy.teacherPermissions,
            }
          : null,
      }),
    );
  } catch (err) {
    console.error("[me] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load session"));
  }
};
