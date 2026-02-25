const School = require("../models/School");
const SchoolPolicy = require("../models/SchoolPolicy");
const User = require("../models/User");

const { successResponse, errorResponse } = require("../utils/response");
const { signToken } = require("../services/tokenService");
const { seedDefaultCategories } = require("../services/seedService");
const { generateSchoolCode } = require("../utils/generateSchoolCode");
const { ensureSchoolGroups } = require("../services/groupService");

const MAX_SCHOOL_CODE_ATTEMPTS = 15;

const isDuplicateKeyError = (error) => {
  return Boolean(error && error.code === 11000);
};

exports.signupSchool = async (req, res) => {
  try {
    const { schoolName, adminName, adminEmail, adminPassword } = req.body || {};

    if (!schoolName || !adminName || !adminEmail || !adminPassword) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing required fields"));
    }

    let school = null;

    for (
      let attempt = 0;
      attempt < MAX_SCHOOL_CODE_ATTEMPTS && !school;
      attempt += 1
    ) {
      const generatedSchoolCode = generateSchoolCode();

      try {
        school = await School.create({
          name: String(schoolName).trim(),
          schoolCode: generatedSchoolCode,
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          continue;
        }

        throw error;
      }
    }

    if (!school) {
      return res
        .status(500)
        .json(
          errorResponse(
            "SCHOOL_CODE_GENERATION_FAILED",
            "Could not generate a unique school code",
          ),
        );
    }

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
    await ensureSchoolGroups({ schoolId: school._id });

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
