const crypto = require("crypto");
const mongoose = require("mongoose");

const ParentStudentLink = require("../models/ParentStudentLink");
const Student = require("../models/Student");
const User = require("../models/User");

const { normalizeEmail } = require("../utils/normalize");
const { successResponse, errorResponse } = require("../utils/response");
const { sendParentWelcomeEmail } = require("../services/parentWelcomeService");

const generateTemporaryPassword = () => {
  return crypto.randomBytes(24).toString("base64url").slice(0, 20);
};

const relationshipOptions = ["Mother", "Father", "Guardian", "Other"];

const mapStudentSummary = (student) => {
  if (!student) return null;

  return {
    id: String(student._id),
    firstName: student.firstName || "",
    lastName: student.lastName || "",
    fullName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
    admissionNumber: student.admissionNumber || "",
    yearGroup: student.yearGroup || null,
    form: student.form || null,
    group: student.groupId
      ? {
        id: String(student.groupId._id || ""),
        label: student.groupId.label || "",
        code: student.groupId.code || "",
        year: student.groupId.year ?? null,
        form: student.groupId.form || "",
      }
      : null,
  };
};

const mapParentSummary = (parent) => {
  if (!parent) return null;

  const parts = String(parent.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  return {
    id: String(parent._id),
    firstName,
    lastName,
    name: parent.name || "",
    email: parent.email || "",
    phone: "",
    status: parent.status || "inactive",
  };
};

const mapLinkDetails = (link) => ({
  id: String(link._id),
  parentId: String(link.parentId?._id || link.parentId),
  studentId: String(link.studentId?._id || link.studentId),
  relationshipType: link.relationshipType || "",
  status: link.status,
  createdAt: link.createdAt,
  updatedAt: link.updatedAt,
});

const findLinkWithDetails = async ({ schoolId, parentLinkId }) => {
  return ParentStudentLink.findOne({ _id: parentLinkId, schoolId })
    .populate({ path: "parentId", select: "name email status" })
    .populate({
      path: "studentId",
      select: "firstName lastName admissionNumber yearGroup form groupId",
      populate: { path: "groupId", select: "label code year form" },
    })
    .lean();
};

const listAvailableStudents = async (schoolId) => {
  const students = await Student.find({ schoolId })
    .sort({ firstName: 1, lastName: 1 })
    .limit(200)
    .populate({ path: "groupId", select: "label code year form" })
    .lean();

  return students.map((student) => mapStudentSummary(student));
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


exports.listParentLinks = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const links = await ParentStudentLink.find({ schoolId })
      .populate({ path: "parentId", select: "name email" })
      .populate({ path: "studentId", select: "firstName lastName" })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = links.map((link) => ({
      id: String(link._id),
      parentId: link.parentId?._id ? String(link.parentId._id) : String(link.parentId || ""),
      parentName: link.parentId?.name || "",
      parentEmail: link.parentId?.email || "",
      studentId: link.studentId?._id ? String(link.studentId._id) : String(link.studentId || ""),
      studentName: link.studentId
        ? `${link.studentId.firstName || ""} ${link.studentId.lastName || ""}`.trim()
        : "",
      relationshipType: link.relationshipType || "",
      status: link.status,
      createdAt: link.createdAt,
    }));

    return res.json(successResponse(mapped));
  } catch (err) {
    console.error("[listParentLinks] error:", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load parent links"));
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

exports.getParentLinkDetails = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { parentLinkId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(parentLinkId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "parentLinkId is invalid"));
    }

    const link = await findLinkWithDetails({ schoolId, parentLinkId });

    if (!link || !link.parentId || !link.studentId) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Parent link not found"));
    }

    const availableStudents = await listAvailableStudents(schoolId);

    return res.json(successResponse({
      link: mapLinkDetails(link),
      parent: mapParentSummary(link.parentId),
      student: mapStudentSummary(link.studentId),
      availableStudents,
      relationshipOptions,
    }));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not load parent details"));
  }
};

exports.updateParentProfile = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { parentLinkId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(parentLinkId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "parentLinkId is invalid"));
    }

    const link = await ParentStudentLink.findOne({ _id: parentLinkId, schoolId }).lean();
    if (!link) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Parent link not found"));
    }

    const { firstName, lastName, email } = req.body || {};
    const updates = {};

    if (firstName !== undefined || lastName !== undefined) {
      const nextFirstName = firstName !== undefined ? String(firstName || "").trim() : "";
      const nextLastName = lastName !== undefined ? String(lastName || "").trim() : "";
      const fullName = `${nextFirstName} ${nextLastName}`.trim();

      if (!fullName) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "Name is required"));
      }

      updates.name = fullName;
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json(errorResponse("VALIDATION_ERROR", "Email is required"));
      }
      updates.email = normalizedEmail;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "No valid fields to update"));
    }

    const parent = await User.findOne({
      _id: link.parentId,
      schoolId,
      role: "parent",
    });

    if (!parent) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Parent not found"));
    }

    Object.assign(parent, updates);
    await parent.save();

    return res.json(successResponse(mapParentSummary(parent)));
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("CONFLICT", "Email already exists"));
    }
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update parent"));
  }
};

exports.reassignParentLink = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const schoolId = req.auth.schoolId;
    const { parentLinkId } = req.params;
    const { newStudentId, relationshipType, relationship } = req.body || {};
    const nextRelationship = relationshipType !== undefined ? relationshipType : relationship;

    if (!mongoose.Types.ObjectId.isValid(parentLinkId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "parentLinkId is invalid"));
    }

    if (newStudentId !== undefined && !mongoose.Types.ObjectId.isValid(newStudentId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "newStudentId is invalid"));
    }

    if (nextRelationship !== undefined && !String(nextRelationship || "").trim()) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "relationshipType cannot be empty"));
    }

    if (newStudentId === undefined && nextRelationship === undefined) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "No reassignment updates provided"));
    }

    let payload = null;

    await session.withTransaction(async () => {
      const link = await ParentStudentLink.findOne({ _id: parentLinkId, schoolId }).session(session);
      if (!link) {
        throw new Error("LINK_NOT_FOUND");
      }

      if (newStudentId !== undefined) {
        const student = await Student.findOne({ _id: newStudentId, schoolId }).session(session).lean();
        if (!student) {
          throw new Error("STUDENT_NOT_FOUND");
        }

        const conflict = await ParentStudentLink.findOne({
          schoolId,
          parentId: link.parentId,
          studentId: newStudentId,
          _id: { $ne: link._id },
        }).session(session).lean();

        if (conflict) {
          throw new Error("DUPLICATE_LINK");
        }

        link.studentId = newStudentId;
      }

      if (nextRelationship !== undefined) {
        link.relationshipType = String(nextRelationship || "").trim();
      }

      await link.save({ session });
      payload = link;
    });

    return res.json(successResponse({
      id: String(payload._id),
      studentId: String(payload.studentId),
      relationshipType: payload.relationshipType || "",
      status: payload.status,
    }));
  } catch (err) {
    if (err.message === "LINK_NOT_FOUND") {
      return res.status(404).json(errorResponse("NOT_FOUND", "Parent link not found"));
    }
    if (err.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json(errorResponse("NOT_FOUND", "Student not found"));
    }
    if (err.message === "DUPLICATE_LINK") {
      return res.status(409).json(errorResponse("CONFLICT", "Parent already linked to selected student"));
    }
    if (err && err.code === 11000) {
      return res.status(409).json(errorResponse("CONFLICT", "Parent link already exists"));
    }
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not reassign parent link"));
  } finally {
    await session.endSession();
  }
};

exports.updateParentLinkStatus = async (req, res) => {
  try {
    const schoolId = req.auth.schoolId;
    const { parentLinkId } = req.params;
    const { status, isActive } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(parentLinkId)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "parentLinkId is invalid"));
    }

    let nextStatus = status;
    if (typeof isActive === "boolean") {
      nextStatus = isActive ? "active" : "revoked";
    }

    if (!["active", "revoked"].includes(nextStatus)) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "status must be active or revoked"));
    }

    const link = await ParentStudentLink.findOneAndUpdate(
      { _id: parentLinkId, schoolId },
      { $set: { status: nextStatus } },
      { new: true },
    ).lean();

    if (!link) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Parent link not found"));
    }

    return res.json(successResponse({
      id: String(link._id),
      status: link.status,
    }));
  } catch (err) {
    return res.status(500).json(errorResponse("SERVER_ERROR", "Could not update parent link status"));
  }
};
