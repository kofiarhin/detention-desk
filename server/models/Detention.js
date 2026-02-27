const mongoose = require("mongoose");

const DetentionSchema = new mongoose.Schema(
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
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
      index: true,
    },
    minutesAssigned: { type: Number, required: true, min: 0 },
    minutesRemaining: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "scheduled", "served", "voided"],
      default: "pending",
      index: true,
    },
    scheduledFor: { type: Date, default: null },
    servedAt: { type: Date, default: null },
    servedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    voidedAt: { type: Date, default: null },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

DetentionSchema.pre("validate", function (next) {
  if (!this.assignedTeacherId && this.createdBy) {
    this.assignedTeacherId = this.createdBy;
  }
  next();
});

DetentionSchema.index({ schoolId: 1, studentId: 1, status: 1 });
DetentionSchema.index({ schoolId: 1, createdAt: -1 });
DetentionSchema.index({ schoolId: 1, scheduledFor: 1 });

module.exports = mongoose.model("Detention", DetentionSchema);
