const mongoose = require("mongoose");

const IncidentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    assignedTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    notes: { type: String, default: "", trim: true },
    occurredAt: { type: Date, required: true },
    severity: { type: String, default: null, trim: true },
    status: { type: String, enum: ["open", "voided"], default: "open" },
  },
  { timestamps: true },
);


IncidentSchema.pre("validate", function (next) {
  if (!this.assignedTeacherId && this.reportedBy) {
    this.assignedTeacherId = this.reportedBy;
  }
  next();
});

IncidentSchema.index({ schoolId: 1, studentId: 1, occurredAt: -1 });
IncidentSchema.index({ schoolId: 1, categoryId: 1 });

module.exports = mongoose.model("Incident", IncidentSchema);
