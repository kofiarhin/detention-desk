const School = require("../models/School");
const SchoolPolicy = require("../models/SchoolPolicy");
const User = require("../models/User");

const { successResponse, errorResponse } = require("../utils/response");
const {
  normalizeSchoolCode,
  isValidSchoolCode,
} = require("../utils/normalize");
const { signToken } = require("../services/tokenService");
const { seedDefaultCategories } = require("../services/seedService");

exports.signupSchool = async (req, res) => {
  try {
    const { schoolName, schoolCode, adminName, adminEmail, adminPassword } =
      req.body || {};

    if (
      !schoolName ||
      !schoolCode ||
      !adminName ||
      !adminEmail ||
      !adminPassword
    ) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing required fields"));
    }

    if (!isValidSchoolCode(schoolCode)) {
      return res
        .status(400)
        .json(
          errorResponse(
            "INVALID_SCHOOL_CODE",
            "School code must be 6–8 chars A–Z/0–9 (no O/0/I/1/L)",
          ),
        );
    }

    const codeNorm = normalizeSchoolCode(schoolCode);

    const exists = await School.findOne({
      schoolCodeNormalized: codeNorm,
    }).lean();
    if (exists)
      return res
        .status(409)
        .json(errorResponse("SCHOOL_CODE_TAKEN", "School code already in use"));

    const school = await School.create({
      name: String(schoolName).trim(),
      schoolCode: codeNorm,
    });

    const policy = await SchoolPolicy.create({
      schoolId: school._id,
      defaultDetentionMinutes: 30,
      rewardOffsetMinutes: 5,
    });

    const passwordHash = await User.hashPassword(adminPassword);

    const adminUser = await User.create({
      schoolId: school._id,
      name: String(adminName).trim(),
      email: adminEmail,
      passwordHash,
      role: "schoolAdmin",
    });

    await seedDefaultCategories({ schoolId: school._id });

    const token = signToken({
      userId: adminUser._id,
      schoolId: school._id,
      role: adminUser.role,
    });

    return res.status(201).json(
      successResponse({
        token,
        user: {
          id: String(adminUser._id),
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
        school: {
          id: String(school._id),
          name: school.name,
          schoolCode: school.schoolCode,
          status: school.status,
        },
        policy: {
          id: String(policy._id),
          defaultDetentionMinutes: policy.defaultDetentionMinutes,
          rewardOffsetMinutes: policy.rewardOffsetMinutes,
          teacherPermissions: policy.teacherPermissions,
        },
      }),
    );
  } catch (err) {
    console.error("[signupSchool] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not create school"));
  }
};
