const mongoose = require("mongoose");

const RewardSchema = new mongoose.Schema(
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    minutesAwarded: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "", trim: true },
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    awardedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

RewardSchema.index({ schoolId: 1, studentId: 1, awardedAt: -1 });

module.exports = mongoose.model("Reward", RewardSchema);
