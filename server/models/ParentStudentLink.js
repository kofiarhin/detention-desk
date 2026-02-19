const mongoose = require("mongoose");

const ParentStudentLinkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    relationshipType: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ParentStudentLinkSchema.index({ schoolId: 1, parentId: 1, status: 1 });
ParentStudentLinkSchema.index({ schoolId: 1, studentId: 1, status: 1 });
ParentStudentLinkSchema.index(
  { schoolId: 1, parentId: 1, studentId: 1 },
  { unique: true },
);

module.exports = mongoose.model("ParentStudentLink", ParentStudentLinkSchema);
