const crypto = require("crypto");

const ParentStudentLink = require("../models/ParentStudentLink");
const Student = require("../models/Student");
const User = require("../models/User");

const { normalizeEmail } = require("../utils/normalize");
const { successResponse, errorResponse } = require("../utils/response");
const { sendParentWelcomeEmail } = require("../services/parentWelcomeService");

const generateTemporaryPassword = () => {
  return crypto.randomBytes(24).toString("base64url").slice(0, 20);
};

exports.createParentAndLink = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId, parentName, email, relationshipType } = req.body || {};

    if (!schoolId) {
      return res
        .status(401)
        .json(errorResponse("TENANT_REQUIRED", "Tenant context required"));
    }

    if (!studentId || !parentName || !email) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing required fields"));
    }

    const student = await Student.findOne({ _id: studentId, schoolId }).lean();
    if (!student) {
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", "Student not found"));
    }

    const normalizedEmail = normalizeEmail(email);
    let parent = await User.findOne({ schoolId, emailNormalized: normalizedEmail });
    let temporaryPassword = null;

    if (!parent) {
      temporaryPassword = generateTemporaryPassword();
      const passwordHash = await User.hashPassword(temporaryPassword);
      parent = await User.create({
        schoolId,
        name: String(parentName).trim(),
        email: normalizedEmail,
        passwordHash,
        role: "parent",
        status: "active",
        mustChangePassword: true,
      });
    } else if (parent.role !== "parent") {
      return res
        .status(409)
        .json(errorResponse("CONFLICT", "Email already belongs to another role"));
    }

    const link = await ParentStudentLink.findOneAndUpdate(
      { schoolId, parentId: parent._id, studentId: student._id },
      {
        $set: {
          status: "active",
          relationshipType: relationshipType ? String(relationshipType).trim() : "",
          createdBy: req.auth.userId,
        },
        $setOnInsert: {
          schoolId,
          parentId: parent._id,
          studentId: student._id,
        },
      },
      { upsert: true, new: true },
    ).lean();

    if (temporaryPassword) {
      const loginUrl = process.env.PARENT_LOGIN_URL || process.env.APP_LOGIN_URL || "";
      await sendParentWelcomeEmail({
        toEmail: parent.email,
        parentName: parent.name,
        loginUrl,
        temporaryPassword,
      });
    }

    return res.status(201).json(
      successResponse({
        parent: {
          id: String(parent._id),
          name: parent.name,
          email: parent.email,
          role: parent.role,
          status: parent.status,
          mustChangePassword: Boolean(parent.mustChangePassword),
        },
        link: {
          id: String(link._id),
          studentId: String(link.studentId),
          parentId: String(link.parentId),
          relationshipType: link.relationshipType,
          status: link.status,
        },
      }),
    );
  } catch (err) {
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json(errorResponse("CONFLICT", "Parent link already exists"));
    }

    console.error("[createParentAndLink] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not create parent"));
  }
};

exports.revokeParentLink = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Missing link id"));
    }

    const link = await ParentStudentLink.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { status: "revoked" } },
      { new: true },
    ).lean();

    if (!link) {
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", "Link not found"));
    }

    return res.json(
      successResponse({
        id: String(link._id),
        status: link.status,
      }),
    );
  } catch (err) {
    console.error("[revokeParentLink] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not revoke parent link"));
  }
};
