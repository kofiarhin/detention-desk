const mongoose = require("mongoose");

const DetentionOffsetSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      required: true,
      index: true,
    },
    detentionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Detention",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    minutesApplied: { type: Number, required: true, min: 1 },
    appliedAt: { type: Date, required: true },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

DetentionOffsetSchema.index({ schoolId: 1, rewardId: 1 });
DetentionOffsetSchema.index({ schoolId: 1, detentionId: 1 });

module.exports = mongoose.model("DetentionOffset", DetentionOffsetSchema);
